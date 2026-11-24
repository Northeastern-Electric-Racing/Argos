// covers: services/socket.service services/storage.service
// reconnect: after the connection drops, the client reconnects and sends the same topics again, no
// reload. The counter in the corner (lib.js) shows what this browser receives. Needs scylla-server with topic
// rooms (#1010) and Calypso's simulator.
const lib = require('./lib');

module.exports = {
  title: 'Selective delivery: reconnect',
  route: '/bms',
  viewport: { width: 1440, height: 900 },
  ready: async (h) => {
    await lib.install(h.page);
    await lib.waitFor(h.page, (msgs) => msgs > 300);
  },
  steps: [
    {
      name: 'BMS live',
      caption: 'The BMS page live.',
      run: async (h) => {
        await h.wait(3000); // the heatmap's cells fill in
        await h.dwell(3000);
      },
    },
    {
      name: 'Connection drops',
      caption: 'The connection drops: nothing arrives.',
      run: async (h) => {
        await lib.drop(h.page, 5000);
        await h.page.waitForFunction(() => !window.__demo.connected);
        await lib.waitFor(h.page, (msgs) => msgs === 0, 3000);
        await h.dwell(3500);
      },
    },
    {
      name: 'Reconnected',
      caption: "Reconnected: the client sends the page's topics again on connect, so the same data comes back without a reload.",
      run: async (h) => {
        await lib.waitFor(h.page, (msgs) => msgs > 300, 20000);
        await h.wait(1500); // the counter's 1 s window catches up
        await h.dwell(5500);
      },
    },
  ],
};
