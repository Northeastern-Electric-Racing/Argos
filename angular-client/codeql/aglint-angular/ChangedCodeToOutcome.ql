/**
 * @name Changed code influences an outcome
 * @description Data/implicit flow from an expression on a line changed by this diff to an outcome sink
 *              (DB write, network, client storage, auth SDK), through Angular DI and signals.
 * @kind path-problem
 * @problem.severity warning
 * @id aglint/angular/changed-code-to-outcome
 * @tags aglint G4 G5
 */
import javascript
import AglintAngular

module Cfg implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node n) { Aglint::changedNode(n) }
  predicate isSink(DataFlow::Node n) { Aglint::outcome(n, _) }
  predicate isAdditionalFlowStep(DataFlow::Node a, DataFlow::Node b) { Aglint::step(a, b, _) }
}

module Flow = TaintTracking::Global<Cfg>;
import Flow::PathGraph

from Flow::PathNode src, Flow::PathNode sink, string kind
where Flow::flowPath(src, sink) and Aglint::outcome(sink.getNode(), kind)
select sink.getNode(), src, sink, "Outcome [" + kind + "] is influenced by changed code $@.", src.getNode(),
  src.getNode().toString()
