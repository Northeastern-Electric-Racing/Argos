// Helpers for the epic #991 demos: an on-screen counter of what this browser's Socket.IO connection
// actually receives (data msgs/s, distinct topics) and the topic list it last sent, plus a way to drop
// the connection. It wraps window.WebSocket, so it has to be installed before the app loads.
// Drops go through Playwright's WebSocket routing: closing the socket from inside the page doesn't take.

/** Runs in the page before the app: wraps WebSocket and draws the counter. */
function counter() {
  const Native = window.WebSocket;
  const state = { times: [], seen: new Map(), list: '-', connected: false, sockets: new Set() };
  window.__demo = state;
  window.WebSocket = function (url, protocols) {
    const ws = new Native(url, protocols);
    if (!String(url).includes('/socket.io/')) return ws; // the dev server's live reload
    state.sockets.add(ws);
    ws.addEventListener('open', () => (state.connected = true));
    ws.addEventListener('close', () => {
      state.sockets.delete(ws);
      state.connected = [...state.sockets].some((s) => s.readyState === 1);
    });
    ws.addEventListener('message', (e) => {
      if (typeof e.data !== 'string' || !e.data.startsWith('42["data"')) return;
      const now = performance.now();
      state.times.push(now);
      try {
        state.seen.set(JSON.parse(JSON.parse(e.data.slice(2))[1]).name, now);
      } catch {}
    });
    const send = ws.send.bind(ws);
    ws.send = (msg) => {
      if (typeof msg === 'string') {
        if (msg.startsWith('40{')) state.list = `handshake: ${JSON.parse(msg.slice(2)).topics?.length ?? 'none'} topics`;
        if (msg.startsWith('42["set_subscriptions"')) {
          const { seq, topics } = JSON.parse(msg.slice(2))[1];
          state.list = `list #${seq}: ${topics.length} topics`;
        }
      }
      return send(msg);
    };
    return ws;
  };
  Object.assign(window.WebSocket, Native);
  window.WebSocket.prototype = Native.prototype;

  const draw = () => {
    let box = document.getElementById('demo-counter');
    if (!box && document.body) {
      box = document.createElement('div');
      box.id = 'demo-counter';
      box.style.cssText =
        'position:fixed;right:12px;bottom:12px;z-index:2147483647;pointer-events:none;padding:8px 12px;' +
        'border-radius:8px;background:rgba(0,0,0,.78);color:#fff;font:600 13px/1.5 ui-monospace,Menlo,monospace;';
      document.body.appendChild(box);
    }
    if (!box) return;
    const now = performance.now();
    while (state.times.length && state.times[0] < now - 1000) state.times.shift();
    for (const [topic, t] of state.seen) if (t < now - 2000) state.seen.delete(topic);
    box.innerHTML =
      `${state.connected ? '🟢 connected' : '🔴 disconnected'}<br>` +
      `data: ${state.times.length} msgs/s<br>topics (last 2 s): ${state.seen.size}<br>${state.list}`;
  };
  setInterval(draw, 250);
}

/** Per page: the routed Socket.IO connections, and until when new ones are refused. */
const routes = new WeakMap();

module.exports = {
  /** Installs the counter and the socket route, and reloads so both see the app's socket from the start. Call in ready. */
  install: async (page) => {
    const route = { blockUntil: 0, open: new Set() };
    routes.set(page, route);
    await page.routeWebSocket(/\/socket\.io\//, (ws) => {
      if (Date.now() < route.blockUntil) return ws.close({ code: 4000, reason: 'demo: dropped' });
      const server = ws.connectToServer();
      const conn = { ws, server };
      route.open.add(conn);
      ws.onClose(() => route.open.delete(conn));
    });
    // Socket.IO reconnects over HTTP long-polling first, so refuse that too while dropped.
    // Its handshake (with the topic list) then goes over polling too, out of the counter's sight, so read it here.
    await page.route(/\/socket\.io\//, async (req) => {
      if (Date.now() < route.blockUntil) return req.abort('connectionrefused');
      const handshake = (req.request().postData() ?? '').split('\x1e').find((packet) => packet.startsWith('40{'));
      if (handshake) {
        const list = `handshake: ${JSON.parse(handshake.slice(2)).topics?.length ?? 'none'} topics`;
        await page.evaluate((list) => window.__demo && (window.__demo.list = list), list).catch(() => {});
      }
      return req.fallback();
    });
    await page.addInitScript(counter);
    await page.reload();
    await page.locator('#demo-counter').waitFor();
  },
  /** What the counter shows: { msgs, topics, connected }. */
  read: (page) =>
    page.evaluate(() => {
      const s = window.__demo;
      return { msgs: s.times.length, topics: s.seen.size, connected: s.connected };
    }),
  /** Waits until pred(msgs in the last second, topics in the last 2 s) holds. */
  waitFor: (page, pred, timeout = 20000) =>
    page.waitForFunction(
      (src) => {
        const s = window.__demo;
        const now = performance.now();
        const msgs = s.times.filter((t) => t >= now - 1000).length;
        const topics = [...s.seen.values()].filter((t) => t >= now - 2000).length;
        return new Function(`return (${src})`)()(msgs, topics);
      },
      pred.toString(),
      { timeout, polling: 250 },
    ),
  /** Drops the connection for ms: closes the socket and refuses reconnects until then. */
  drop: async (page, ms) => {
    const route = routes.get(page);
    route.blockUntil = Date.now() + ms;
    for (const { ws, server } of route.open) {
      await server.close().catch(() => {});
      await ws.close({ code: 4000, reason: 'demo: dropped' }).catch(() => {});
    }
  },
};
