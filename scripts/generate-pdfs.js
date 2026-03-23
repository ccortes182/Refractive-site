#!/usr/bin/env node
/**
 * Generate PDFs from the styled HTML document pages using Puppeteer.
 * Run: node scripts/generate-pdfs.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const DOCS_DIR = path.resolve(__dirname, '..', 'docs');
const OUT_DIR = path.join(DOCS_DIR, 'downloads');

const pages = [
  { file: 'signal-scan.html',       output: 'Refractive_Signal_Scan.pdf' },
  { file: 'spectrum-sprint.html',    output: 'Refractive_Spectrum_Sprint.pdf' },
  { file: 'how-we-work.html',       output: 'Refractive_How_We_Work.pdf' },
  { file: 'investor-onepager.html',  output: 'Refractive_Investor_OnePager.pdf' },
  { file: 'illuminate-roadmap.html', output: 'Refractive_Illuminate_Roadmap.pdf' },
];

(async () => {
  // Ensure output dir exists
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'new' });

  for (const { file, output } of pages) {
    const filePath = path.join(DOCS_DIR, file);
    const outPath = path.join(OUT_DIR, output);

    console.log(`Generating ${output}...`);

    const page = await browser.newPage();
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0', timeout: 30000 });

    // Use the @media print styles already in doc.css
    await page.emulateMediaType('print');

    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0.75in', bottom: '0.75in', left: '0.75in', right: '0.75in' },
    });

    await page.close();
    console.log(`  -> ${outPath}`);
  }

  await browser.close();
  console.log('\nAll PDFs generated.');
})();
