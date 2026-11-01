import { TreeNode } from 'primeng/api';
import { GlobalPassThrough } from 'primeng/config';
import { TreePassThrough } from 'primeng/tree';

/**
 * App-wide PrimeNG pass-through attributes.
 * PrimeIcons draw a private-use glyph in ::before, and Chrome adds it to the accessible name of the
 * button around it ("\ue90d Add"), so icons next to a label are hidden from assistive tech.
 * Icon-only buttons still need their own ariaLabel.
 */
const ArgosPt: GlobalPassThrough = {
  button: { icon: { 'aria-hidden': 'true' } },
  togglebutton: { icon: { 'aria-hidden': 'true' } },
  menu: { itemIcon: { 'aria-hidden': 'true' } }
};

export default ArgosPt;

/** What PrimeNG's Tree passes to a node section's pass-through function */
interface TreeNodePtOptions {
  context: { node: TreeNode; expanded?: boolean };
}

/**
 * Tree toggle buttons have no name of their own, so they say what a press does to which node.
 * Tree nodes only read the [pt] their Tree is given, not the global config, so each tree spreads this in.
 */
export const namedTreeToggles: TreePassThrough = {
  nodeToggleButton: (options) => {
    const { node, expanded } = (options as unknown as TreeNodePtOptions).context;
    return { 'aria-label': `${expanded ? 'Collapse' : 'Expand'} ${node.label ?? ''}`.trim() };
  }
};
