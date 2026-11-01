/**
 * @name Function purity label
 * @description CUSTOM (aglint v2, SPEC-v2 sections 2.3 and 10): labels every app function pure, effectful or unknown.
 *              effectful = its calls* closure reaches an outcome sink (`Aglint::outcome`, AglintAngular.qll: HttpClient
 *              writes and reads, fetch, socket.io / WebSocket / EventSource, client storage writes, auth SDK sinks) or any
 *              call into the auth SDK package.
 *              unknown = no such effect, but the closure holds a call that cannot be resolved to app code and is not on
 *              the documented allow-list below, a non-literal import()/require(), `eval`, or `Function`.
 *              pure = neither. Precedence: effectful > unknown > pure. Be conservative: when in doubt, unknown.
 *              Message: `<symbol> :: <label>[ [<effect>, ...]][ via {<symbol>, ...}][ unresolved {<what>@<line>, ...}]`
 *              with symbol `<uri>#<Class.method | function>` (the trace recorder uses the same naming).
 * @kind problem
 * @problem.severity recommendation
 * @id aglint/purity
 * @tags aglint purity
 *
 * Not picked up by the directory-level analyze call of run.sh on purpose: the wave-2 integrator switches that call to
 * the explicit list ChangedCodeToOutcome.ql LowTrustToOutcome.ql OutcomeInventory.ql, then runs this file separately.
 *
 * Documented choices (CUSTOM):
 *  - Rows exist for class members (incl. the implicit constructor that runs field initializers), top-level function
 *    declarations and top-level `const f = () => ...`. Closures belong to their enclosing row (their sinks and calls are
 *    attributed to it); a closure has no row of its own, so trace frames inside closures are neutral (SPEC section 6).
 *  - Effect roots: a function literal given to @angular/core `effect`, `afterRender`, `afterEveryRender`,
 *    `afterNextRender` or `afterRenderEffect` (directly, or as one phase of a `{write: () => ...}` object) runs later,
 *    from Angular's scheduler, not from the function that registers it. It is a row of its own, named
 *    `<owner>>effect` (`<owner>>afterNextRender.write`, ...; the n-th one of the same API in one owner, n >= 2, gets a
 *    `#n` suffix), and the registering function neither calls it nor inherits its effects. The trace recorder uses the
 *    same names, so a runtime effect inside `effect()` is explained by the effect's own row.
 *  - `inject(Cls)` adds a calls edge to Cls's constructor (DI instantiates it).
 *  - Allow-list of calls that do NOT make a function unknown (no app-visible effect): ECMAScript data builtins
 *    (Math except random, Number, String, JSON.parse/stringify, Object.keys/values/entries/freeze/fromEntries, Array.*),
 *    Intl.* (locale dependent, treated as pure), non-mutating data methods on any receiver (trim, map, filter, ...;
 *    a non-literal callback argument to a higher-order one is reported as unresolved), Angular signal reads and
 *    set/update (and reads of fields initialised by an @angular/core creator, matched by field name), free functions of @angular/core, @angular/core/rxjs-interop and rxjs, and Observable
 *    pipe/subscribe/then/catch/finally (their callbacks are lexically inside the function). Everything else that does not resolve to
 *    app code (router.navigateByUrl, next(req), localStorage.getItem, Date.now, console.log, ...) is unresolved.
 */
import javascript
import AglintAngular

/** A row of the first three kinds (class member, top-level function declaration, top-level const arrow/function). */
private predicate plainRow(Function f, string qualname) {
  exists(string p | p = f.getFile().getRelativePath() |
    p.matches("src/%") and not p.matches("%.spec.ts") and not p.matches("%.d.ts")
  ) and
  (
    exists(MemberDefinition m |
      m.getInit() = f and
      m.getDeclaringClass().getName() != "" and
      qualname = m.getDeclaringClass().getName() + "." + m.getName()
    )
    or
    f instanceof FunctionDeclStmt and
    f.getEnclosingContainer() instanceof TopLevel and
    (if f.getName() = "" then qualname = "default" else qualname = f.getName())
    or
    exists(VariableDeclarator d |
      d.getInit() = f and
      d.getContainer() instanceof TopLevel and
      qualname = d.getBindingPattern().(VarDecl).getName()
    )
  )
}

/** The nearest plain row that encloses a piece of code (closures in between are skipped). */
private Function plainOwner(StmtContainer c) {
  plainRow(c, _) and result = c
  or
  not plainRow(c, _) and result = plainOwner(c.getEnclosingContainer())
}

private string effectApi() {
  result = ["effect", "afterRender", "afterEveryRender", "afterNextRender", "afterRenderEffect"]
}

/** `fn` is a function literal registered by `call` to @angular/core `api`: the first argument, or phase `.<p>` of it. */
private predicate effectCallback(DataFlow::CallNode call, string api, Function fn, string phase) {
  api = effectApi() and
  call = API::moduleImport("@angular/core").getMember(api).getACall() and
  (
    fn = call.getArgument(0).asExpr() and phase = ""
    or
    exists(Property prop |
      prop = call.getArgument(0).asExpr().(ObjectExpr).getAProperty() and
      fn = prop.getInit() and
      phase = "." + prop.getName()
    )
  )
}

/** 1-based position, in source order, of `fn` among the `api`+`phase` effect callbacks registered in `owner`. */
private int effectIndex(Function owner, string api, string phase, Function fn) {
  fn =
    rank[result](Function g, DataFlow::CallNode c |
      effectCallback(c, api, g, phase) and plainOwner(c.getContainer()) = owner
    |
      g order by g.getLocation().getStartLine(), g.getLocation().getStartColumn()
    )
}

/** An effect root: `<owner>>effect`, `<owner>>afterNextRender.write`, `<owner>>effect#2`, ... */
private predicate effectRoot(Function fn, string qualname) {
  exists(DataFlow::CallNode call, string api, string phase, Function owner, string oq, int n, string suffix |
    effectCallback(call, api, fn, phase) and
    owner = plainOwner(call.getContainer()) and
    plainRow(owner, oq) and
    n = effectIndex(owner, api, phase, fn) and
    // ARGOS: AGLint's template wrote `(if n = 1 then "" else "#" + n.toString())`, which CodeQL 2.27.3 does not
    // compile; same meaning, as a formula. Drop this edit once AGLint's template has the fix.
    (n = 1 and suffix = "" or n > 1 and suffix = "#" + n.toString()) and
    qualname = oq + ">" + api + phase + suffix
  )
}

/** A function with a row: a plain row (class member, top-level function) or an effect root. */
class AppFunction extends Function {
  string qualname;

  AppFunction() { plainRow(this, qualname) or effectRoot(this, qualname) }

  string getSymbol() { result = this.getFile().getRelativePath() + "#" + qualname }
}

/** The row that a piece of code belongs to: the function itself, else the nearest enclosing row (closures). */
AppFunction ownerOf(StmtContainer c) {
  result = c
  or
  not c instanceof AppFunction and result = ownerOf(c.getEnclosingContainer())
}

private predicate isSdk(Function g) {
  exists(string pre | pre = ["aglint-no-sdk/%"] and g.getFile().getRelativePath().matches(pre)) and
  not g.getFile().getRelativePath().matches("%.d.ts")
}

/** Effects: outcome sinks, plus every call that resolves into the third-party auth SDK package. */
predicate directEffect(AppFunction f, string kind) {
  exists(DataFlow::Node sink | Aglint::outcome(sink, kind) and f = ownerOf(sink.getContainer()))
  or
  exists(DataFlow::InvokeNode c |
    isSdk(c.getACallee()) and f = ownerOf(c.getContainer()) and kind = "auth-sdk (LOW trust)"
  )
}

private predicate isInject(CallExpr call) {
  call.getCallee().(Identifier).getName() = "inject" and
  exists(ImportDeclaration imp |
    imp.getImportedPathString() = "@angular/core" and
    imp.getASpecifier().getImportedName() = "inject" and
    imp.getFile() = call.getFile()
  )
}

predicate calls(AppFunction f, AppFunction g) {
  exists(DataFlow::InvokeNode c | f = ownerOf(c.getContainer()) and g = ownerOf(c.getACallee()))
  or
  exists(CallExpr inj, DataFlow::ClassNode cls |
    isInject(inj) and
    cls = inj.getArgument(0).getNameBinding().getClassNode() and
    f = ownerOf(inj.getContainer()) and
    g = ownerOf(cls.getConstructor().getFunction())
  )
}

// ---------------------------------------------------------------------------------------------- allow-list
private string pureMethod() {
  result =
    [
      "trim", "trimStart", "trimEnd", "toLowerCase", "toUpperCase", "toLocaleLowerCase", "toLocaleUpperCase",
      "startsWith", "endsWith", "includes", "indexOf", "lastIndexOf", "slice", "substring", "substr", "split", "join",
      "concat", "at", "keys", "values", "entries", "toFixed", "toString", "localeCompare", "replace", "replaceAll",
      "padStart", "padEnd", "repeat", "charAt", "charCodeAt", "normalize", "match", "test", "format", "clone"
    ] or result = higherOrderMethod() or result = ["pipe", "subscribe", "then", "catch", "finally"]
}

private string higherOrderMethod() {
  result = ["map", "filter", "reduce", "reduceRight", "find", "findIndex", "findLast", "some", "every", "flat", "flatMap"]
}

private predicate builtinMemberCall(DataFlow::InvokeNode c) {
  exists(string m | c = DataFlow::globalVarRef("Math").getAMemberInvocation(m) and m != "random")
  or
  c = DataFlow::globalVarRef(["Number", "String"]).getAMemberInvocation(_)
  or
  c = DataFlow::globalVarRef("JSON").getAMemberInvocation(["parse", "stringify"])
  or
  c = DataFlow::globalVarRef("Object").getAMemberInvocation(["keys", "values", "entries", "freeze", "fromEntries", "is"])
  or
  c = DataFlow::globalVarRef("Array").getAMemberInvocation(["isArray", "from", "of"])
}

private predicate builtinFree(string g) {
  g =
    [
      "Number", "String", "Boolean", "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent",
      "decodeURIComponent", "Array", "Object", "Map", "Set", "Error", "RegExp", "BigInt", "Symbol"
    ]
}

private string frameworkModule() { result = ["@angular/core", "@angular/core/rxjs-interop", "rxjs", "rxjs/operators"] }

/** A call whose effect is already reported as an outcome sink (HttpClient, fetch, storage writes, SDK sinks). */
private predicate isEffectCall(DataFlow::InvokeNode c) {
  c instanceof ClientRequest
  or
  exists(DataFlow::Node s | Aglint::outcome(s, _) and (s = c.getAnArgument() or s = c))
  or
  exists(string m | m = ["get", "post", "put", "patch", "delete", "request", "head", "options", "jsonp"] and c = Aglint::httpCall(m))
}

/**
 * Name of a class field initialised by an @angular/core creator (signal, computed, input, input.required, model, ...).
 * Reading it, `x.name()`, is a signal read. Matched by field name across classes (heuristic: a signal that crosses DI,
 * `inject(AuthService).isLoggedIn()`, is not type-tracked by AglintAngular.qll).
 */
private predicate signalFieldName(string name) {
  exists(FieldDefinition fd |
    fd.getName() = name and
    fd.getInit().flow() = API::moduleImport(frameworkModule()).getAMember*().getAnInvocation()
  )
}

private predicate neutralCall(DataFlow::InvokeNode c) {
  builtinMemberCall(c)
  or
  exists(string g | c = DataFlow::globalVarRef(g).getAnInvocation() and builtinFree(g))
  or
  c = DataFlow::globalVarRef("Intl").getAPropertyRead(_).getAnInvocation()
  or
  c.(DataFlow::MethodCallNode).getMethodName() = pureMethod()
  or
  exists(DataFlow::CallNode creator | c = Aglint::signalLike(creator).getACall())
  or
  exists(DataFlow::CallNode creator |
    c = Aglint::signalLike(creator).getAMethodCall(["set", "update", "asReadonly"])
  )
  or
  c = API::moduleImport(frameworkModule()).getAMember*().getAnInvocation()
  or
  signalFieldName(c.getCalleeNode().(DataFlow::PropRead).getPropertyName())
}

private predicate resolvedToCode(DataFlow::InvokeNode c) {
  exists(Function g | g = c.getACallee() |
    g.getFile().getRelativePath().matches("src/%") and not g.getFile().getRelativePath().matches("%.d.ts")
    or
    isSdk(g)
  )
}

private string calleeName(DataFlow::InvokeNode c) {
  result = c.getCalleeName()
  or
  not exists(c.getCalleeName()) and result = "<computed>"
}

/** `what` of a blind spot for an invocation. */
private predicate blindInvoke(DataFlow::InvokeNode c, string what) {
  c = DataFlow::globalVarRef("eval").getACall() and what = "eval"
  or
  c = DataFlow::globalVarRef("Function").getAnInvocation() and what = "Function"
  or
  c = DataFlow::globalVarRef("require").getACall() and
  not c.getArgument(0).asExpr() instanceof StringLiteral and
  what = "require()"
  or
  (c = DataFlow::globalVarRef(["setTimeout", "setInterval"]).getACall() and
  not c.getArgument(0).getALocalSource() instanceof DataFlow::FunctionNode and
  c.getArgument(0).asExpr() instanceof StringLiteral and
  what = c.getCalleeName() + "-string")
  or
  // unresolved and not on the allow-list
  not resolvedToCode(c) and
  not neutralCall(c) and
  not isEffectCall(c) and
  not c = DataFlow::globalVarRef(["eval", "Function", "require"]).getAnInvocation() and
  what = "unresolved-call:" + calleeName(c)
  or
  // higher-order data method given a callback that is not a function literal (its body is invisible here)
  exists(DataFlow::MethodCallNode m, DataFlow::Node arg |
    m = c and
    m.getMethodName() = higherOrderMethod() and
    arg = m.getAnArgument() and
    (arg.asExpr() instanceof Identifier or arg.asExpr() instanceof PropAccess) and
    not arg = DataFlow::globalVarRef(["Boolean", "Number", "String"]) and
    what = "unresolved-call:" + m.getMethodName() + "(callback)"
  )
}

predicate blindSpot(AppFunction f, string what, int line) {
  exists(DataFlow::InvokeNode c | f = ownerOf(c.getContainer()) and blindInvoke(c, what) and line = c.getStartLine())
  or
  exists(DynamicImportExpr di |
    f = ownerOf(di.getContainer()) and
    not di.getSource() instanceof StringLiteral and
    what = "import()" and
    line = di.getLocation().getStartLine()
  )
}

// ---------------------------------------------------------------------------------------------- labelling
string effectsOf(AppFunction f) { exists(AppFunction g | calls*(f, g) and directEffect(g, result)) }

string viaOf(AppFunction f) {
  exists(AppFunction g | calls*(f, g) and directEffect(g, _) and result = g.getSymbol())
}

string unresolvedOf(AppFunction f) {
  exists(AppFunction g, string what, int line |
    calls*(f, g) and blindSpot(g, what, line) and result = what + "@" + line
  )
}

string label(AppFunction f) {
  if exists(effectsOf(f))
  then result = "effectful"
  else if exists(unresolvedOf(f)) then result = "unknown" else result = "pure"
}

string effectsPart(AppFunction f) {
  if exists(effectsOf(f))
  then result = " [" + strictconcat(string e | e = effectsOf(f) | e, ", " order by e) + "]"
  else result = ""
}

string viaPart(AppFunction f) {
  if exists(effectsOf(f))
  then result = " via {" + strictconcat(string v | v = viaOf(f) | v, ", " order by v) + "}"
  else result = ""
}

string unresolvedPart(AppFunction f) {
  if exists(unresolvedOf(f))
  then result = " unresolved {" + strictconcat(string u | u = unresolvedOf(f) | u, ", " order by u) + "}"
  else result = ""
}

from AppFunction f
select f, f.getSymbol() + " :: " + label(f) + effectsPart(f) + viaPart(f) + unresolvedPart(f)
