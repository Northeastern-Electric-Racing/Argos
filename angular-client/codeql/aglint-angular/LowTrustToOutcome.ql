/**
 * @name LOW-trust value reaches an outcome
 * @description A value returned by a LOW-trust dependency (auth SDK, per trust-tiers.model.yml) flows to an
 *              outcome sink (DB write, network, client storage).
 * @kind path-problem
 * @problem.severity error
 * @id aglint/angular/low-trust-to-outcome
 * @tags aglint G4 G6
 */
import javascript
import AglintAngular

module Cfg implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node n) { Aglint::lowTrustSource(n) }
  predicate isSink(DataFlow::Node n) {
    Aglint::outcome(n, _) and not Aglint::outcome(n, "auth-sdk (LOW trust)")
  }
  predicate isAdditionalFlowStep(DataFlow::Node a, DataFlow::Node b) { Aglint::step(a, b, _) }
  predicate isBarrier(DataFlow::Node n) {
    // the auth interceptor attaching the bearer token to /api requests is the sanctioned use
    n.getFile().getRelativePath() = "src/app/auth/auth.interceptor.ts"
  }
}

module Flow = TaintTracking::Global<Cfg>;
import Flow::PathGraph

from Flow::PathNode src, Flow::PathNode sink, string kind
where Flow::flowPath(src, sink) and Aglint::outcome(sink.getNode(), kind)
select sink.getNode(), src, sink, "LOW-trust value from $@ reaches outcome [" + kind + "].", src.getNode(),
  src.getNode().toString()
