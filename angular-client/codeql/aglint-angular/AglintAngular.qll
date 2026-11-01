/**
 * CUSTOM (G4/G6): Angular semantics + AGLint outcome sinks for CodeQL JS.
 * - Angular DI: `inject(C)` returns an instance of C, so `this.f.m(x)` on an injected field resolves to C.m.
 * - Angular signals: signal(v)/.set(v)/.update(fn) feed reads `s()`; computed(fn) returns fn's result on `c()`.
 * - Implicit (control) influence: the test of `c ? a : b` and of `if (c) return ...` influences the result.
 * - Outcomes: network-write (HttpClient/fetch writes, socket.io `emit`, `WebSocket.send`), network (any request URL, the
 *   socket.io / WebSocket / EventSource connection), client-storage, auth-sdk. A browser client cannot see whether a
 *   write reaches a DB (the backend decides), so HTTP writes are network-write, not db-write.
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

  /** A socket.io-client connection: `io(url, opts)`, `connect(url)`, the default export, or the module called directly. */
  DataFlow::CallNode socketIoCall() {
    result = API::moduleImport("socket.io-client").getMember(["io", "connect", "default"]).getACall()
    or
    result = API::moduleImport("socket.io-client").getACall()
  }

  /** A connection object of kind `api`: a socket.io socket (`socket`) or a `new WebSocket(url)` (`WebSocket`). */
  private DataFlow::InvokeNode connection(string api) {
    result = socketIoCall() and api = "socket"
    or
    result = DataFlow::globalVarRef("WebSocket").getAnInstantiation() and api = "WebSocket"
  }

  private DataFlow::SourceNode connectionRef(string api, DataFlow::TypeTracker t) {
    t.start() and result = connection(api)
    or
    exists(DataFlow::TypeTracker t2 | result = connectionRef(api, t2).track(t2, t))
  }

  /**
   * A reference to a connection of kind `api`, type-tracked from its creation, plus every `this.<f>` read of a class
   * that stores a connection in field `f` (constructor assignment or field initializer; matched by field name within
   * the class), so `this.socket.emit(...)` in any method of a service that opened the socket is found.
   */
  DataFlow::SourceNode connectionRef(string api) {
    result = connectionRef(api, DataFlow::TypeTracker::end())
    or
    exists(DataFlow::ClassNode cls, string f |
      connectionRef(api, DataFlow::TypeTracker::end()).flowsTo(cls.getAReceiverNode().getAPropertyWrite(f).getRhs()) and
      result = cls.getAReceiverNode().getAPropertyRead(f)
    )
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

  /** Outcome sinks, labelled by outcome kind. */
  predicate outcome(DataFlow::Node sink, string kind) {
    exists(DataFlow::MethodCallNode c, string m | c = httpCall(m) |
      sink = c.getAnArgument() and
      (
        m = ["post", "put", "patch", "delete"] and kind = "network-write (HttpClient." + m + ")"
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
      (if m = "fetch" then kind = "network-write (fetch)" else kind = "network-write (HttpClient." + m + ")")
    )
    or
    exists(ClientRequest r |
      sink = r.getUrl() and
      not r.(DataFlow::MethodCallNode).getMethodName() = ["post", "put", "patch", "delete"] and
      kind = "network-read"
    )
    or
    // socket.io-client: the connection arguments (an argument-less `io()` connects to the page origin), every emit
    exists(DataFlow::CallNode c | c = socketIoCall() |
      (sink = c.getAnArgument() or not exists(c.getAnArgument()) and sink = c) and kind = "network (socket.io connect)"
    )
    or
    exists(DataFlow::MethodCallNode c | c = connectionRef("socket").getAMethodCall(["emit", "emitWithAck", "send"]) |
      sink = c.getAnArgument() and kind = "network-write (socket." + c.getMethodName() + ")"
    )
    or
    // WebSocket: the URL, and every frame sent
    exists(DataFlow::NewNode c | c = connection("WebSocket") |
      sink = c.getAnArgument() and kind = "network (WebSocket)"
    )
    or
    exists(DataFlow::MethodCallNode c | c = connectionRef("WebSocket").getAMethodCall("send") |
      sink = c.getAnArgument() and kind = "network-write (WebSocket.send)"
    )
    or
    // EventSource: a server-sent-events stream (read only)
    exists(DataFlow::NewNode c | c = DataFlow::globalVarRef("EventSource").getAnInstantiation() |
      sink = c.getAnArgument() and kind = "network-read (EventSource)"
    )
    or
    sink instanceof WebStorageWrite and kind = "client-storage"
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
