// covers: services/storage.service services/socket.service services/cell.service
// selective-delivery: the client receives only the topics its page reads (epic #991). The counter in the corner
// (lib.js) counts the data messages and topics this browser actually receives, and the topic list it last sent.
// Needs scylla-server with topic rooms (#1010) and Calypso's simulator.
const lib = require('./lib');

const nav = (h, label) => h.click(h.page.locator('sidebar-chip', { hasText: label }).first());

module.exports = {
  title: 'Selective delivery: switching pages',
  route: '/charging',
  viewport: { width: 1440, height: 900 },
  ready: async (h) => {
    await lib.install(h.page);
    await lib.waitFor(h.page, (msgs, topics) => msgs > 0 && topics > 0);
  },
  steps: [
    {
      name: 'Charging',
      caption: 'The Charging page receives only its own topics.',
      run: async (h) => {
        await h.wait(3000); // the page's values fill in
        await h.dwell(3000);
      },
    },
    {
      name: 'Open BMS',
      caption: 'Opening BMS sends one list with its topics, cell topics included while the heatmap shows them.',
      run: async (h) => {
        await nav(h, 'BMS');
        await lib.waitFor(h.page, (msgs) => msgs > 300);
        // Real time, not a dwell, even for stills: the sweep that drops Charging-only topics runs meanwhile.
        await h.wait(6000);
        await h.dwell(2000);
      },
    },
    {
      name: 'Back to Charging',
      caption: "BMS's topics expire but keep arriving until the next sweep, so a quick switch back would keep them.",
      run: async (h) => {
        await nav(h, 'Charging');
        await h.wait(1500);
        await h.dwell(1000);
      },
    },
    {
      name: 'Sweep',
      caption: 'The sweep drops every expired topic at once: one list, and back to Charging only.',
      run: async (h) => {
        await lib.waitFor(h.page, (msgs) => msgs < 100, 8000);
        await h.wait(1500); // the counter's 1 s window catches up
        await h.dwell(4500);
      },
    },
  ],
};
