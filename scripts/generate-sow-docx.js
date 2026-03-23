#!/usr/bin/env node
/**
 * Generate the SOW Master Outline as a styled Word (.docx) file.
 * Run: node scripts/generate-sow-docx.js
 */

const docx = require('docx');
const fs = require('fs');
const path = require('path');

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, ShadingType
} = docx;

const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'downloads');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const ACCENT = '43A9DF';
const DARK   = '212429';

function sectionTitle(text, number) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 120 },
    children: [
      new TextRun({ text: `${number}. ${text}`, bold: true, size: 28, color: DARK }),
    ],
  });
}

function bulletItem(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [
      new TextRun({ text, size: 22, color: '444444' }),
    ],
  });
}

function moduleCard(title, description) {
  return new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [
      new TextRun({ text: title, bold: true, size: 24, color: DARK }),
      new TextRun({ text: ` — ${description}`, size: 22, color: '666666' }),
    ],
  });
}

const doc = new Document({
  creator: 'Refractive',
  title: 'Refractive — Proposal + SOW Master Outline',
  description: 'One reusable structure with modular addenda per pillar.',
  styles: {
    paragraphStyles: [
      {
        id: 'Normal',
        name: 'Normal',
        run: { size: 22, font: 'Calibri', color: '333333' },
        paragraph: { spacing: { after: 80 } },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children: [
        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'REFRACTIVE', bold: true, size: 20, color: ACCENT, font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Proposal + SOW Master Outline', bold: true, size: 36, color: DARK }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [
            new TextRun({ text: 'One reusable structure with modular addenda per pillar. Export PDF per client.', size: 22, color: '666666', italics: true }),
          ],
        }),

        // 1. Overview
        sectionTitle('Overview', 1),
        bulletItem('Client name, scope summary, objectives'),
        bulletItem('Term, start date, billing terms'),

        // 2. Scope of Work
        sectionTitle('Scope of Work', 2),
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: 'Choose modules based on client needs:', size: 22, color: '444444' })],
        }),
        moduleCard('Module A: Foundation', 'Business strategy, positioning, GTM, creative strategy, ops integrations'),
        moduleCard('Module B: Growth', 'Paid social/search, creative production, marketplaces, analytics and reporting'),
        moduleCard('Module C: Experience', 'Shopify development, CRO and A/B testing, SEO, AI enhancements, Performance UX'),
        moduleCard('Module D: Retention', 'Email/SMS, loyalty/referral, subscription, customer support systems, affiliate'),
        moduleCard('Module E: Illuminate', 'Dashboards, incrementality plan, MMM planning, weekly memo'),

        // 3. Deliverables
        sectionTitle('Deliverables & Cadence', 3),
        bulletItem('Weekly memo'),
        bulletItem('Monthly roadmap'),
        bulletItem('Quarterly reset'),

        // 4. Responsibilities
        sectionTitle('Responsibilities', 4),
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [new TextRun({ text: 'Refractive:', bold: true, size: 22, color: DARK })],
        }),
        bulletItem('Strategy, execution, reporting, optimization, measurement'),
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [new TextRun({ text: 'Client:', bold: true, size: 22, color: DARK })],
        }),
        bulletItem('Access, approvals, decision cadence, margin/goal inputs'),

        // 5. Measurement & KPIs
        sectionTitle('Measurement & KPIs', 5),
        bulletItem('Baseline definition'),
        bulletItem('KPI list'),
        bulletItem('Reporting frequency'),

        // 6. Performance Bonus
        sectionTitle('Performance Bonus (optional addendum)', 6),
        bulletItem('KPI definition'),
        bulletItem('Baseline and thresholds'),
        bulletItem('Payment schedule'),

        // 7. Fees
        sectionTitle('Fees', 7),
        bulletItem('Retainer or fixed project'),
        bulletItem('Out-of-scope rate card'),

        // 8. Legal
        sectionTitle('Legal', 8),
        bulletItem('Confidentiality'),
        bulletItem('IP ownership'),
        bulletItem('Data access'),
        bulletItem('Termination'),
      ],
    },
  ],
});

(async () => {
  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(OUT_DIR, 'Refractive_SOW_Master.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`SOW DOCX generated: ${outPath}`);
})();
