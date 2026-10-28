/**
 * @name Purity labels of application functions
 * @description One row per app function: `<symbol> :: pure|effectful|unknown [effects] via {sink functions}
 *              unresolved {what@line}` (SPEC-v2 section 2.3). effectful: reaches an aglint sink; unknown: reaches
 *              something static analysis cannot follow or vouch for (an unresolved call, `unsafe`, a `static mut`,
 *              interior mutability, unmodelled std I/O, a `&mut` parameter); pure otherwise.
 * @kind problem
 * @problem.severity recommendation
 * @id aglint/purity
 * @tags aglint purity
 */

import rust
import AglintRust
private import codeql.rust.internal.PathResolution as PR

/** A callable whose body counts for `f`: f itself, what it calls, and the closures defined in them. */
predicate inClosure(Function f, Callable c) { appFunction(f) and reaches(f, c) and appFile(c.getFile()) }

/** What makes a function unknown, at a line of the callable `c`. */
predicate blind(Callable c, string what, int line) {
  exists(Call call | call.getEnclosingCallable() = c and line = call.getLocation().getStartLine() |
    not exists(call.getStaticTarget()) and
    not call instanceof Operation and
    what = "unresolved-call:" + calleeText(call)
    or
    exists(string t | t = call.getStaticTarget().getCanonicalPath() |
      t.regexpMatch("<?(core|alloc)::cell::.*|<?(std|core)::sync::.*") and what = "interior-mut:" + t
      or
      t.regexpMatch("<?std::(fs|net|io|process|env|time|thread)::.*") and
      not exists(string k | sinkNode(_, k) and k.matches("aglint-%") and directSink(c, k)) and
      what = "std-io:" + t
    )
  )
  or
  exists(BlockExpr b | b.isUnsafe() and b.getEnclosingCallable() = c and what = "unsafe" and line = b.getLocation().getStartLine())
  or
  exists(PathExpr p, Static s |
    s.isMut() and p.getEnclosingCallable() = c and PR::resolvePath(p.getPath()) = s and
    what = "static-mut:" + s.getName().getText() and line = p.getLocation().getStartLine()
  )
}

/** A `&mut` parameter of `f` itself: f may change its caller's state. */
predicate mutParam(Function f, string what, int line) {
  exists(Param p | p = f.getParamList().getAParam() and p.getTypeRepr().(RefTypeRepr).isMut() |
    what = "mut-param:" + p.getPat().toString() and line = p.getLocation().getStartLine()
  )
  or
  exists(SelfParam p | p = f.getParamList().getSelfParam() and p.isRef() and p.isMut() |
    what = "mut-param:self" and line = p.getLocation().getStartLine()
  )
}

predicate unresolved(Function f, string what, int line) {
  exists(Callable c | inClosure(f, c) and blind(c, what, line))
  or
  appFunction(f) and mutParam(f, what, line)
}

string effects(Function f) {
  result = " [" + concat(string k | reachesSink(f, k, _) | k, ", ") + "]"
}

string label(Function f) {
  if reachesSink(f, _, _)
  then result = "effectful"
  else
    if unresolved(f, _, _)
    then result = "unknown"
    else result = "pure"
}

string viaPart(Function f) {
  if reachesSink(f, _, _)
  then result = effects(f) + " via {" + concat(Function g | reachesSink(f, _, g) | symbol(g), ", ") + "}"
  else result = ""
}

string unresolvedPart(Function f) {
  if unresolved(f, _, _)
  then result = " unresolved {" + concat(string w, int l | unresolved(f, w, l) | w + "@" + l.toString(), ", " order by l, w) + "}"
  else result = ""
}

string msg(Function f) { result = symbol(f) + " :: " + label(f) + viaPart(f) + unresolvedPart(f) }

from Function f
where appFunction(f)
select f, msg(f)
