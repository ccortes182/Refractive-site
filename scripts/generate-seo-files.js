const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://refractive.co';
const DOCS_DIR = path.join(__dirname, '..', 'docs');

const EXCLUDED_DIRS = new Set([
  'css',
  'downloads',
  'fonts',
  'frames',
  'illuminate-app',
  'images',
  'investor',
  'js',
  'portal',
  'videos',
]);

const EXCLUDED_FILES = new Set([
  '404.html',
  'deck.html',
  'illuminate-roadmap.html',
  'investor-onepager.html',
  'investor.html',
  'pitch.html',
  'portal.html',
  'sow.html',
]);

const EXCLUDED_PREFIXES = [
  'blog/archive/',
];

const KEY_PAGE_ORDER = [
  '/',
  '/solutions.html',
  '/illuminate.html',
  '/playbooks.html',
  '/blog/index.html',
  '/about.html',
  '/how-we-work.html',
];

function walkHtmlFiles(dir, relativeDir = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      files.push(...walkHtmlFiles(fullPath, relativePath));
      continue;
    }

    if (!entry.name.endsWith('.html')) {
      continue;
    }

    if (EXCLUDED_FILES.has(entry.name)) {
      continue;
    }

    if (EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
      continue;
    }

    files.push({
      fullPath,
      relativePath,
    });
  }

  return files;
}

function extractMeta(html, pattern) {
  const match = html.match(pattern);
  return match ? decodeHtml(match[1].trim()) : '';
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function toUrl(relativePath) {
  if (relativePath === 'index.html') {
    return `${SITE_URL}/`;
  }

  return `${SITE_URL}/${relativePath}`;
}

function toPathname(relativePath) {
  return relativePath === 'index.html' ? '/' : `/${relativePath}`;
}

function getPriority(pathname) {
  if (pathname === '/') {
    return '1.0';
  }

  if (KEY_PAGE_ORDER.includes(pathname)) {
    return '0.9';
  }

  if (pathname.startsWith('/blog/')) {
    return pathname === '/blog/index.html' ? '0.8' : '0.7';
  }

  if (pathname.startsWith('/careers/')) {
    return '0.7';
  }

  if (pathname.startsWith('/the-index/') || pathname.startsWith('/tools/')) {
    return '0.7';
  }

  return '0.6';
}

function getChangefreq(pathname) {
  if (pathname === '/' || pathname === '/blog/index.html') {
    return 'weekly';
  }

  if (pathname.startsWith('/blog/')) {
    return 'monthly';
  }

  return 'monthly';
}

function groupLabel(pathname) {
  if (pathname === '/' || KEY_PAGE_ORDER.includes(pathname)) {
    return 'Core Pages';
  }

  if (pathname.startsWith('/blog/')) {
    return 'The Index';
  }

  if (pathname.startsWith('/the-index/') || pathname.startsWith('/tools/')) {
    return 'Tools and Calculators';
  }

  if (pathname.startsWith('/careers/')) {
    return 'Careers';
  }

  return 'Additional Pages';
}

function comparePages(a, b) {
  const aIndex = KEY_PAGE_ORDER.indexOf(a.pathname);
  const bIndex = KEY_PAGE_ORDER.indexOf(b.pathname);

  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }

  return a.pathname.localeCompare(b.pathname);
}

function buildSitemapXml(pages) {
  const items = pages.map((page) => {
    return [
      '  <url>',
      `    <loc>${page.url}</loc>`,
      `    <lastmod>${page.lastmod}</lastmod>`,
      `    <changefreq>${page.changefreq}</changefreq>`,
      `    <priority>${page.priority}</priority>`,
      '  </url>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    items,
    '</urlset>',
    '',
  ].join('\n');
}

function buildSitemapHtml(pages) {
  const grouped = new Map();

  for (const page of pages) {
    const label = groupLabel(page.pathname);
    if (!grouped.has(label)) {
      grouped.set(label, []);
    }
    grouped.get(label).push(page);
  }

  const sections = Array.from(grouped.entries()).map(([label, items]) => {
    const links = items.map((page) => {
      const description = page.description ? `<p>${escapeHtml(page.description)}</p>` : '';
      return [
        '<li>',
        `<a href="${page.pathname === '/' ? '/' : page.pathname}">${escapeHtml(page.title || page.pathname)}</a>`,
        description,
        '</li>',
      ].join('');
    }).join('\n');

    return [
      `<section class="sitemap-section">`,
      `<h2>${escapeHtml(label)}</h2>`,
      '<ul>',
      links,
      '</ul>',
      '</section>',
    ].join('\n');
  }).join('\n');

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <meta name="robots" content="noindex,follow">',
    '  <title>Sitemap | Refractive</title>',
    `  <link rel="canonical" href="${SITE_URL}/sitemap.html">`,
    '  <style>',
    '    :root { color-scheme: dark; }',
    '    body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #14171c; color: #f4f7fa; }',
    '    main { max-width: 960px; margin: 0 auto; padding: 64px 24px 80px; }',
    '    h1 { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3rem); }',
    '    p { color: rgba(244, 247, 250, 0.76); line-height: 1.6; }',
    '    .sitemap-section { margin-top: 40px; }',
    '    .sitemap-section h2 { margin-bottom: 12px; font-size: 1.1rem; letter-spacing: 0.08em; text-transform: uppercase; }',
    '    ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }',
    '    li { padding: 16px 18px; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; background: rgba(255,255,255,0.03); }',
    '    a { color: #c2dcd4; font-weight: 600; text-decoration: none; }',
    '    a:hover { color: #43a9df; }',
    '    li p { margin: 6px 0 0; font-size: 0.96rem; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main>',
    '    <h1>Refractive Sitemap</h1>',
    '    <p>This page lists the major public pages we want search engines and AI retrieval systems to discover. Search Console should use the XML sitemap at <a href="/sitemap.xml">/sitemap.xml</a>.</p>',
    sections,
    '  </main>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

function buildRobotsTxt() {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /404.html',
    'Disallow: /blog/archive/',
    'Disallow: /deck.html',
    'Disallow: /downloads/',
    'Disallow: /illuminate-app/',
    'Disallow: /illuminate-roadmap.html',
    'Disallow: /investor-onepager.html',
    'Disallow: /investor/',
    'Disallow: /pitch.html',
    'Disallow: /portal/',
    '',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    '',
    'User-agent: ChatGPT-User',
    'Allow: /',
    '',
    'User-agent: Claude-SearchBot',
    'Allow: /',
    '',
    'User-agent: Claude-User',
    'Allow: /',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');
}

function buildLlmsTxt(pages) {
  const pick = (pathname) => pages.find((page) => page.pathname === pathname);
  const curated = [
    pick('/'),
    pick('/solutions.html'),
    pick('/illuminate.html'),
    pick('/playbooks.html'),
    pick('/blog/index.html'),
    pick('/about.html'),
    pick('/how-we-work.html'),
  ].filter(Boolean);

  const lines = [
    '# Refractive',
    '',
    '> Refractive is a senior-operator ecommerce growth partner for DTC brands, covering strategy, paid media, creative, conversion, retention, and measurement.',
    '',
    `Canonical site: ${SITE_URL}/`,
    `XML sitemap: ${SITE_URL}/sitemap.xml`,
    `HTML sitemap: ${SITE_URL}/sitemap.html`,
    `Contact: growth@refractive.co`,
    '',
    '## Preferred discovery pages',
  ];

  for (const page of curated) {
    lines.push(`- ${page.url} :: ${page.title}${page.description ? ` — ${page.description}` : ''}`);
  }

  lines.push(
    '',
    '## Topic coverage',
    '- Ecommerce growth strategy',
    '- Paid media and creative systems',
    '- Shopify conversion and site performance',
    '- Email, SMS, and retention programs',
    '- Attribution, incrementality, MMM, and marketing measurement',
    '- Operator frameworks, calculators, and growth tools',
    '',
    '## Crawling notes',
    '- Public marketing pages, blog posts, and open tools are intended for discovery.',
    '- Protected portal, investor, app, and download paths are not intended for open crawling.',
    '- For the complete public URL list, use the XML sitemap.',
    '',
  );

  return lines.join('\n');
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function collectPages() {
  return walkHtmlFiles(DOCS_DIR)
    .map(({ fullPath, relativePath }) => {
      const html = fs.readFileSync(fullPath, 'utf8');

      if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) {
        return null;
      }

      const pathname = toPathname(relativePath);
      const stat = fs.statSync(fullPath);

      return {
        pathname,
        url: toUrl(relativePath),
        title: extractMeta(html, /<title>([^<]+)<\/title>/i),
        description: extractMeta(html, /<meta\s+name="description"\s+content="([^"]*)"/i),
        priority: getPriority(pathname),
        changefreq: getChangefreq(pathname),
        lastmod: stat.mtime.toISOString().split('T')[0],
      };
    })
    .filter(Boolean)
    .sort(comparePages);
}

function writeFile(relativePath, contents) {
  fs.writeFileSync(path.join(DOCS_DIR, relativePath), contents, 'utf8');
}

function main() {
  const pages = collectPages();

  writeFile('sitemap.xml', buildSitemapXml(pages));
  writeFile('sitemap.html', buildSitemapHtml(pages));
  writeFile('robots.txt', buildRobotsTxt());
  writeFile('llms.txt', buildLlmsTxt(pages));

  console.log(`Generated SEO files for ${pages.length} public pages.`);
}

main();
