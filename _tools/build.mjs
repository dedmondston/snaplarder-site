/**
 * Rebuilds the generated parts of snaplarder.com from the app.
 *
 *   node _tools/build.mjs <path to the app>
 *   e.g.  node _tools/build.mjs ../fresh-expo
 *
 * Writes every page on the site: index.html, support.html and 404.html
 * from _tools/pages/, privacy.html, terms.html and food-safety.html from
 * the app's legal.js, food/*.html from its shelf-life data, plus
 * sitemap.xml and robots.txt.
 *
 * Run it whenever legal.js or expiryData.json changes in the app, then
 * commit and push the site. Nothing to install: plain Node 20 or later.
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAppModules, loadShelfLifeTable } from './load-app.mjs';
import { buildLegal } from './build-legal.mjs';
import { buildFood } from './build-food.mjs';
import { buildPages } from './build-pages.mjs';
import { SITE } from './page.mjs';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = process.argv[2];

if (!appRoot) {
  console.error('Usage: node _tools/build.mjs <path to the app folder>');
  process.exit(1);
}

const app = await loadAppModules(appRoot, ['legal', 'storageLocation', 'shelfLife', 'foodNames']);
const table = await loadShelfLifeTable(appRoot);
if (!table) {
  console.error(`No assets/expiryData.json found in ${path.resolve(appRoot)}`);
  process.exit(1);
}

const legalPages = await buildLegal(siteRoot, app);
const foodPages = await buildFood(siteRoot, table, app);
const ownPages = await buildPages(siteRoot);

const pages = [...ownPages.filter((p) => p !== '404.html'), ...legalPages, ...foodPages];
const today = new Date().toISOString().slice(0, 10);
const loc = (p) => `${SITE}/${p.replace(/(^|\/)index\.html$/, '$1')}`;

await writeFile(
  path.join(siteRoot, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${loc(p)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`,
  'utf8'
);

await writeFile(path.join(siteRoot, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`, 'utf8');

console.log(`Built ${ownPages.length} site pages, ${legalPages.length} legal pages and ${foodPages.length} food pages; sitemap lists ${pages.length} pages.`);
