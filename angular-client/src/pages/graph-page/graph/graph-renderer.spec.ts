import { GraphRenderer } from './graph-renderer';

describe('GraphRenderer', () => {
  it('asks for a WebGL2 drawing buffer without multisampling, depth or stencil', () => {
    if (!document.createElement('canvas').getContext('webgl2')) {
      pending('WebGL2 is unavailable in this browser');
    }
    const glCanvas = document.createElement('canvas');
    const renderer = new GraphRenderer(glCanvas, document.createElement('canvas'));

    // 1px lines need none of these, and each multiplies the drawing buffer's GPU memory
    const attrs = (glCanvas.getContext('webgl2') as WebGL2RenderingContext).getContextAttributes();
    expect(attrs).toEqual(jasmine.objectContaining({ antialias: false, depth: false, stencil: false, alpha: true }));
    renderer.destroy();
  });
});
