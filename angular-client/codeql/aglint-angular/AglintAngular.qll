/**
 * CUSTOM (G4/G6): Angular semantics + AGLint outcome sinks for CodeQL JS.
 * - Angular DI: `inject(C)` returns an instance of C, so `this.f.m(x)` on an injected field resolves to C.m.
 * - Angular signals: signal(v)/.set(v)/.update(fn) feed reads `s()`; computed(fn) returns fn's result on `c()`.
 * - Implicit (control) influence: the test of `c ? a : b` and of `if (c) return ...` influences the result.
 * - Outcomes: db-write (HttpClient/fetch write), network (any request URL), client-storage, auth-sdk.
 */
import javascript
import semmle.javascript.security.dataflow.DOM
private import semmle.javascript.dataflow.internal.PreCallGraphStep

extensible predicate aglintChangedLine(string file, int line);

/** A syntactic call to Angular's `inject(...)` (syntactic so it can feed the call graph). */
private class InjectCall extends CallExpr {
  InjectCall() {
    this.getCallee().(Identifier).getName() = "inject" and
    exists(ImportDeclaration imp | imp.getImportedPathString() = "@angular/core" and
      imp.getASpecifier().getImportedName() = "inject" and imp.getFile() = this.getFile())
  }
}

/**
 * Angular DI (HIGH-trust framework semantics): `inject(C)` yields an instance of class C, so the call graph
 * resolves `this.api.create(...)` to `OrdersApi.create`; `inject(TOKEN)` yields the token factory's result.
 */
private class AngularDependencyInjection extends PreCallGraphStep {
  override predicate classInstanceSource(DataFlow::ClassNode cls, DataFlow::Node node) {
    exists(InjectCall call |
      node = call.flow() and
      cls = call.getArgument(0).getNameBinding().getClassNode()
    )
  }

  override predicate step(DataFlow::Node pred, DataFlow::Node succ) {
    // new InjectionToken('X', { factory: () => value }) ... inject(X)  (matched by exported name: heuristic)
    exists(NewExpr tok, VariableDeclarator decl, InjectCall call, ObjectExpr opts, Function factory |
      tok.getCallee().(Identifier).getName() = "InjectionToken" and
      decl.getInit() = tok and
      opts = tok.getArgument(1) and
      factory = opts.getPropertyByName("factory").getInit().(Function) and
      call.getArgument(0).(Identifier).getName() = decl.getBindingPattern().(VarDecl).getName() and
      pred = factory.getAReturnedExpr().flow() and
      succ = call.flow()
    )
  }
}

module Aglint {
  private API::Node ngCore() { result = API::moduleImport("@angular/core") }

  /** `inject(HttpClient)` (an npm class, so no ClassNode): tracked to its uses. */
  private DataFlow::SourceNode injectedHttp(DataFlow::TypeTracker t) {
    t.start() and
    exists(DataFlow::CallNode call |
      call = ngCore().getMember("inject").getACall() and
      call.getArgument(0) =
        API::moduleImport("@angular/common/http").getMember("HttpClient").getAValueReachableFromSource() and
      result = call
    )
    or
    exists(DataFlow::TypeTracker t2 | result = injectedHttp(t2).track(t2, t))
  }

  /** A call `http.<m>(...)` on an HttpClient obtained via DI or a typed constructor parameter. */
  DataFlow::MethodCallNode httpCall(string m) {
    (
      result = injectedHttp(DataFlow::TypeTracker::end()).getAMethodCall(m)
      or
      result = API::Node::ofType("@angular/common/http", "HttpClient").getMember(m).getACall()
    ) and
    m = ["get", "post", "put", "patch", "delete", "request", "head", "options", "jsonp"]
  }

  private DataFlow::SourceNode signalLike(DataFlow::CallNode creator, DataFlow::TypeTracker t) {
    t.start() and
    creator = ngCore().getMember(["signal", "computed", "linkedSignal"]).getACall() and
    result = creator
    or
    exists(DataFlow::TypeTracker t2 | result = signalLike(creator, t2).track(t2, t))
  }

  DataFlow::SourceNode signalLike(DataFlow::CallNode creator) {
    result = signalLike(creator, DataFlow::TypeTracker::end())
  }

  /** A value written into a signal created by `creator`. */
  private DataFlow::Node signalWrite(DataFlow::CallNode creator) {
    creator = ngCore().getMember(["signal", "linkedSignal"]).getACall() and
    (
      result = creator.getArgument(0)
      or
      result = signalLike(creator).getAMethodCall("set").getArgument(0)
      or
      result = signalLike(creator).getAMethodCall("update").getCallback(0).getAReturn()
    )
    or
    creator = ngCore().getMember("computed").getACall() and
    result = creator.getCallback(0).getAReturn()
  }

  /** Extra flow edges that encode Angular (HIGH-trust framework) semantics and implicit influence. */
  predicate step(DataFlow::Node pred, DataFlow::Node succ, string how) {
    // signals
    exists(DataFlow::CallNode creator |
      pred = signalWrite(creator) and
      succ = signalLike(creator).getACall() and
      how = "signal read"
    )
    or
    // object/array literals built from influenced values are influenced (request bodies like {...draft, totalCents})
    exists(DataFlow::ObjectLiteralNode o | pred = o.getAPropertyWrite().getRhs() and succ = o) and
    how = "object literal field"
    or
    exists(ObjectExpr o | pred.asExpr() = o.getAProperty().(SpreadProperty).getInit().(SpreadElement).getOperand() and succ.asExpr() = o) and
    how = "object spread"
    or
    exists(ArrayExpr a | pred.asExpr() = a.getAnElement() and succ.asExpr() = a) and
    how = "array literal element"
    or
    // implicit influence through branch conditions
    exists(ConditionalExpr c | pred.asExpr() = c.getCondition() and succ.asExpr() = c) and
    how = "ternary condition"
    or
    exists(IfStmt s, ReturnStmt r, Function f |
      r.getParentStmt*() = s.getAControlledStmt() and
      r.getContainer() = f and
      pred.asExpr() = s.getCondition() and
      succ = DataFlow::valueNode(r.getExpr()) and
      how = "if condition"
    )
  }

  private API::Node socketIo() {
    result = API::moduleImport("socket.io-client").getMember(["io", "connect", "default"])
  }

  private DataFlow::SourceNode socketTracked(DataFlow::TypeTracker t) {
    t.start() and result = socketIo().getACall()
    or
    exists(DataFlow::TypeTracker t2 | result = socketTracked(t2).track(t2, t))
  }

  /** `socket.emit(...)` on a socket.io-client socket (tracked through class fields like `this.socket`). */
  DataFlow::MethodCallNode socketEmit() {
    result = socketTracked(DataFlow::TypeTracker::end()).getAMethodCall("emit")
    or
    result = socketIo().getReturn().getMember("emit").getACall()
  }

  /** Outcome sinks, labelled by outcome kind. */
  predicate outcome(DataFlow::Node sink, string kind) {
    exists(DataFlow::MethodCallNode c, string m | c = httpCall(m) |
      sink = c.getAnArgument() and
      (
        m = ["post", "put", "patch", "delete"] and kind = "db-write (HttpClient." + m + ")"
        or
        not m = ["post", "put", "patch", "delete"] and kind = "network-read (HttpClient." + m + ")"
      )
    )
    or
    exists(ClientRequest r, string m |
      m = r.(DataFlow::MethodCallNode).getMethodName() and m = ["post", "put", "patch", "delete"]
      or
      r instanceof DataFlow::CallNode and
      r.(DataFlow::CallNode).getCalleeName() = "fetch" and
      m = "fetch"
    |
      (sink = r.getADataNode() or sink = r.getUrl() or sink = r.(DataFlow::InvokeNode).getAnArgument()) and
      kind = "db-write (HttpClient." + m + ")"
    )
    or
    exists(ClientRequest r |
      sink = r.getUrl() and
      not r.(DataFlow::MethodCallNode).getMethodName() = ["post", "put", "patch", "delete"] and
      kind = "network-read"
    )
    or
    sink instanceof WebStorageWrite and kind = "client-storage"
    or
    // socket.io-client: the connection options (io(url, {query})) and every emitted payload leave the browser
    sink = socketIo().getACall().getAnArgument() and kind = "network (socket.io)"
    or
    sink = socketEmit().getAnArgument() and kind = "network (socket.emit)"
    or
    ModelOutput::sinkNode(sink, "aglint-auth-sdk") and kind = "auth-sdk (LOW trust)"
  }

  predicate lowTrustSource(DataFlow::Node src) { ModelOutput::sourceNode(src, "aglint-low-trust") }

  predicate changedNode(DataFlow::Node n) {
    exists(string f, int l |
      aglintChangedLine(f, l) and
      n.getFile().getRelativePath() = f and
      n.getStartLine() = l and
      (exists(n.asExpr()) or n instanceof DataFlow::ParameterNode)
    )
  }
}
