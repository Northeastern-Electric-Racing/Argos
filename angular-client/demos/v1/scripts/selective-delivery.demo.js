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
      caption: 'Opening BMS adds its topics at once, in one list, cell topics included while the heatmap shows them.',
      run: async (h) => {
        await nav(h, 'BMS');
        await lib.waitFor(h.page, (msgs) => msgs > 300);
        await h.wait(3000); // the counter's windows fill
        await h.dwell(3000);
      },
    },
    {
      name: 'Open Segment 2',
      caption: "A segment's page keeps only that segment's cell topics; the other four segments' stop at the next sweep.",
      run: async (h) => {
        await h.click(h.page.getByText('See more').nth(1));
        await lib.waitFor(h.page, (msgs) => msgs < 300, 8000);
        await h.wait(2000); // the counter's 2 s topic window catches up
        await h.dwell(3000);
      },
    },
    {
      name: 'Back to Charging',
      caption: "Back on Charging, BMS's topics stop at the next sweep (every 2.5 s), in one list; the shared ones stay.",
      run: async (h) => {
        await nav(h, 'Charging');
        await lib.waitFor(h.page, (msgs) => msgs < 100, 8000);
        await h.wait(2000); // the counter's 2 s topic window catches up
        await h.dwell(4000);
      },
    },
  ],
};
