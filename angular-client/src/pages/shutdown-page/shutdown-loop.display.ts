import { NodeState } from './shutdown-loop.utils';

/** Text and style per node state, so status never relies on colour alone. */
export const NODE_STATE_DISPLAY: Record<NodeState, { label: string; cssClass: string }> = {
  closed: { label: 'Closed', cssClass: 'state-closed' },
  suspect: { label: 'Open — cause', cssClass: 'state-suspect' },
  'downstream-open': { label: 'Open — upstream', cssClass: 'state-downstream' },
  'no-data': { label: 'No data', cssClass: 'state-no-data' }
};

/** Tag shown on the energy-meter interlock until it has a reading. */
export const PLACEHOLDER_TAG = 'placeholder — no reading yet';
