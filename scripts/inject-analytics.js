#!/usr/bin/env node
/* Injects the Refractive analytics + consent snippet into every HTML page
 * under docs/. Idempotent: runs are no-ops on files that already contain the
 * <!-- refractive-analytics --> marker, so it can be re-run after new pages
 * are added.
 *
 * Usage:  node scripts/inject-analytics.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Keep this in sync with docs/js/analytics-loader.js.
const GTM_CONTAINER_ID = 'GTM-TLNXV5JB';

const ROOT = path.resolve(__dirname, '..', 'docs');
const MARKER = '<!-- refractive-analytics -->';

// The Illuminate product app is a separate Vue bundle with its own entrypoint
// and asset pipeline — skip it here and wire tracking through that app's own
// build if/when needed.
const SKIP_DIRS = new Set(['illuminate-app']);

const HEAD_SNIPPET = [
  '',
  '  ' + MARKER,
  '  <link rel="stylesheet" href="/css/consent.css">',
  '  <script src="/js/consent.js"></script>',
  '  <script src="/js/analytics-loader.js"></script>',
  ''
].join('\n');

const NOSCRIPT_SNIPPET = [
  '',
  '  ' + MARKER,
  '  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' +
    GTM_CONTAINER_ID +
    '" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>',
  ''
].join('\n');

const EVENTS_SNIPPET = [
  '',
  '  <script src="/js/analytics-events.js"></script>',
  ''
].join('');

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function inject(html) {
  if (html.includes(MARKER)) return { html, changed: false };

  let next = html;

  // 1. Head: insert just before </head>.
  const headIdx = next.indexOf('</head>');
  if (headIdx === -1) return { html, changed: false };
  next = next.slice(0, headIdx) + HEAD_SNIPPET + next.slice(headIdx);

  // 2. GTM noscript fallback: right after the opening <body ...>.
  next = next.replace(/<body(\s[^>]*)?>/, function (match) {
    return match + NOSCRIPT_SNIPPET;
  });

  // 3. Events loader: just before </body>.
  const bodyCloseIdx = next.lastIndexOf('</body>');
  if (bodyCloseIdx !== -1) {
    next = next.slice(0, bodyCloseIdx) + EVENTS_SNIPPET + next.slice(bodyCloseIdx);
  }

  return { html: next, changed: next !== html };
}

function main() {
  const files = walk(ROOT, []);
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const file of files) {
    try {
      const original = fs.readFileSync(file, 'utf8');
      const { html, changed } = inject(original);
      if (changed) {
        fs.writeFileSync(file, html);
        updated += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      errors.push({ file, err });
    }
  }

  const rel = (f) => path.relative(path.resolve(__dirname, '..'), f);
  console.log('Refractive analytics injection');
  console.log('  scanned: ' + files.length);
  console.log('  updated: ' + updated);
  console.log('  skipped (already tagged): ' + skipped);
  if (errors.length) {
    console.log('  errors:  ' + errors.length);
    for (const e of errors) console.log('    - ' + rel(e.file) + ': ' + e.err.message);
    process.exit(1);
  }
}

main();
