/**
 * @name Outcome inventory
 * @description Lists every outcome sink (for base-vs-head comparison: new DB writes / storage / SDK calls).
 * @kind problem
 * @problem.severity recommendation
 * @id aglint/angular/outcome-inventory
 * @tags aglint G5
 */
import javascript
import AglintAngular

from DataFlow::Node sink, string kind
where Aglint::outcome(sink, kind)
select sink, "Outcome sink [" + kind + "] in " + sink.getContainer().(Function).describe()
