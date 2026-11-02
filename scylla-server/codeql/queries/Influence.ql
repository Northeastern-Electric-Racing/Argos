/**
 * @name Influence summary: function -> outcome sinks and entry points
 * @description For every application function, the outcome kinds (DB write, network, auth, storage) it can reach
 *              through the call graph, the app functions with the direct sink (then the vendored functions those call,
 *              so the vendored crate's trust tier is on the path), and the request handlers that reach it.
 *              Same row grammar as the python stack's aglint/influence (downstream rows only), with
 *              `<rel-path>#<qualname>` symbols. The python query's upstream rows (`F <= callers reaching ...`) are left
 *              out on purpose: through shared helpers (`Response::new`) they join unrelated handlers into one graph,
 *              and the witness paths then run from one handler into another's outcome.
 * @kind problem
 * @problem.severity recommendation
 * @id aglint/influence
 * @tags aglint G4 G5
 */

import rust
import AglintRust

/** A request handler: a function of an `api`/`handlers`/`routes` module, or `main`. */
predicate entrypoint(Function h) {
  appFunction(h) and
  (h.getCanonicalPath().regexpMatch("(.*::)?(api|handlers|routes|controllers)::.*") or h.getName().getText() = "main")
}

/** `l` is a library function performing a `kind` sink that `f` reaches (`librarySink` of an app function it reaches). */
predicate librarySinkOf(Function f, string kind, string l) {
  exists(Function g, Callable h |
    reachesSink(f, kind, g) and
    reaches(f, h) and
    (h = g or h.(ClosureExpr).getEnclosingCallable+() = g) and
    librarySink(h, kind, l)
  )
}

from Function f, string msg
where
  appFunction(f) and
  exists(string kind |
    reachesSink(f, kind, _) and
    msg =
      symbol(f) + " => [" + kind + "] via {" + concat(Function g | reachesSink(f, kind, g) | symbol(g), ", ") +
        concat(Function v | exists(Function g | reachesSink(f, kind, g) and vendorCallee(g, v)) | ", " + symbol(v)) +
        concat(string l | librarySinkOf(f, kind, l) | ", " + l) + "}; entrypoints {" + concat(Function h | entrypoint(h) and reaches(h, f) | symbol(h), ", ") + "}"
  )
select f, msg
