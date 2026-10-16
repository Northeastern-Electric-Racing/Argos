// plotly.js partial bundles ship without types; the gl2d bundle exposes the same API as plotly.js.
declare module 'plotly.js-gl2d-dist-min' {
  import * as Plotly from 'plotly.js';
  export default Plotly;
}
