/**
 * Generates the poster image used by the Lucerna embed on both decks.
 *
 * The decks lazy-load the real Lucerna app in an iframe on desktop, but show
 * this still while it boots — and use it *instead* of the iframe on phones,
 * where shipping a ~1.2MB React bundle over cellular is the wrong trade.
 *
 * Run against a local static server:
 *   npx serve docs -l 8899   (or: cd docs && python3 -m http.server 8899)
 *   node scripts/generate-lucerna-preview.js http://localhost:8899
 */

const puppeteer = require('puppeteer');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:8899';
// The Overview dashboard: unlocked on every tier, and the clearest expression
// of the "one dashboard, every channel" claim the decks make. Incrementality
// and Media Mix sit behind LockedFeature and would render a paywall.
const ROUTE = '/lucerna-app/';
const OUT = path.join(__dirname, '..', 'docs', 'images', 'lucerna-preview.png');

// Matches .deck-embed__frame in css/deck-charts.css — keep the two in step so
// the poster and the live iframe are pixel-comparable during the crossfade.
const WIDTH = 1440;
const HEIGHT = 900;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
  await page.goto(BASE + ROUTE, { waitUntil: 'networkidle0', timeout: 60000 });

  // Recharts animates its series in; wait for it to settle before capturing.
  await new Promise((r) => setTimeout(r, 2500));

  await page.screenshot({ path: OUT, type: 'png' });
  await browser.close();

  console.log('Wrote ' + OUT + ' (' + WIDTH + 'x' + HEIGHT + ' @2x)');
})().catch((err) => {
  console.error('Failed to generate the Lucerna preview:', err.message);
  process.exit(1);
});
