/**
 * @name LOW-trust value reaches an outcome
 * @description A value returned by a LOW-trust dependency (auth SDK, per trust-tiers.model.yml) flows to an
 *              outcome sink (network write, network, client storage).
 * @kind path-problem
 * @problem.severity error
 * @id aglint/angular/low-trust-to-outcome
 * @tags aglint G4 G6
 */
import javascript
import AglintAngular

/**
 * Files where a LOW-trust value may reach an outcome because that is their job, such as the interceptor that attaches
 * the auth SDK's token to the app's own API requests. Rows (`- ["src/app/auth/auth.interceptor.ts"]`, exact
 * repo-relative paths) live in models/low-trust-barriers.model.yml; there are none by default. List files, never a
 * pattern such as every `*.interceptor.ts`: a new file that sends the token elsewhere must still be reported.
 */
extensible predicate aglintLowTrustBarrier(string file);

module Cfg implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node n) { Aglint::lowTrustSource(n) }
  predicate isSink(DataFlow::Node n) {
    Aglint::outcome(n, _) and not Aglint::outcome(n, "auth-sdk (LOW trust)")
  }
  predicate isAdditionalFlowStep(DataFlow::Node a, DataFlow::Node b) { Aglint::step(a, b, _) }
  predicate isBarrier(DataFlow::Node n) {
    // the sanctioned uses, by exact path: rows of models/low-trust-barriers.model.yml (none by default)
    aglintLowTrustBarrier(n.getFile().getRelativePath())
  }
}

module Flow = TaintTracking::Global<Cfg>;
import Flow::PathGraph

from Flow::PathNode src, Flow::PathNode sink, string kind
where Flow::flowPath(src, sink) and Aglint::outcome(sink.getNode(), kind)
select sink.getNode(), src, sink, "LOW-trust value from $@ reaches outcome [" + kind + "].", src.getNode(),
  src.getNode().toString()
