/**
 * The shell every page shares: head, App Store banner, navigation bar
 * and footer. Every HTML page on the site is built through this, so the
 * navigation can't differ from page to page.
 */

export const SITE = 'https://snaplarder.com';
export const APP_STORE_ID = '6803253210';
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

/** The quick links in the bar at the top of every page. */
const NAV = [
  ['food/', 'Food guide'],
  ['support.html', 'Support'],
  ['food-safety.html', 'Food safety'],
  ['privacy.html', 'Privacy'],
  ['terms.html', 'Terms'],
];

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} p
 * @param {string} p.path         site path, e.g. 'food/milk.html'
 * @param {string} p.title        <title>
 * @param {string} p.description  meta description
 * @param {string} p.body         everything inside <main>
 * @param {boolean} [p.absolute]  root-relative links (the 404 page, served at any depth)
 * @param {boolean} [p.noindex]
 * @param {string} [p.extraHead]
 */
export function page({ path, title, description, body, absolute = false, noindex = false, extraHead = '' }) {
  // Relative links, so pages also work when opened straight from disk.
  const up = absolute ? '/' : '../'.repeat(path.split('/').length - 1);
  const home = up || './';
  const url = `${SITE}/${path.replace(/(^|\/)index\.html$/, '$1')}`;
  const section = path.startsWith('food/') ? 'food/' : path;

  const links = NAV.map(([href, label]) => {
    const current = href === section ? ' aria-current="page"' : '';
    return `<li><a href="${up}${href}"${current}>${label}</a></li>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SnapLarder">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f4f1e6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#13160f" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${up}site.css">
${extraHead}</head>
<body>
<a class="skip" href="#content">Skip to content</a>

<header class="site-head">
  <div class="wrap bar">
    <a class="brand" href="${home}"${path === 'index.html' ? ' aria-current="page"' : ''}><img src="${up}favicon.svg" alt="" width="28" height="28">SnapLarder</a>
    <a class="get" href="${APP_STORE_URL}">Get the app</a>
    <nav aria-label="Main"><ul>${links}</ul></nav>
  </div>
</header>

<main id="content" class="wrap">
${body}
</main>

<footer class="site-foot">
  <div class="wrap foot-grid">
    <div class="foot-brand">
      <a class="brand" href="${home}"><img src="${up}favicon.svg" alt="" width="28" height="28">SnapLarder</a>
      <p>Reminders before food goes off. Made in the UK by one independent developer.</p>
      <a class="get" href="${APP_STORE_URL}">Get the app</a>
    </div>
    <nav aria-label="Footer">
      <h2>Explore</h2>
      <ul><li><a href="${home}">Home</a></li><li><a href="${up}food/">Food guide</a></li><li><a href="${up}use-by-vs-best-before.html">Use by vs best before</a></li><li><a href="${up}sell-by-vs-use-by-vs-best-by.html">US date labels</a></li><li><a href="${up}christmas-leftovers.html">Christmas leftovers</a></li><li><a href="${up}thanksgiving-leftovers.html">Thanksgiving leftovers</a></li><li><a href="${up}support.html">Support</a></li></ul>
    </nav>
    <nav aria-label="Legal">
      <h2>Legal</h2>
      <ul><li><a href="${up}food-safety.html">Food safety</a></li><li><a href="${up}privacy.html">Privacy</a></li><li><a href="${up}terms.html">Terms</a></li></ul>
    </nav>
    <div>
      <h2>Contact</h2>
      <ul><li><a href="mailto:support@snaplarder.com">support@snaplarder.com</a></li><li><a href="${up}press.html">Press and partners</a></li><li><a href="${up}sitemap.xml">Site map</a></li></ul>
    </div>
  </div>
  <div class="wrap foot-note">
    <p>SnapLarder gives reminders, not food safety advice. Always check food yourself before eating it.</p>
  </div>
</footer>
</body>
</html>
`;
}

export function heading(title, standfirst = '') {
  return `<header class="page-head">
  <h1 class="page-title">${esc(title)}</h1>
  <div class="scale" aria-hidden="true"><span></span><span></span><span></span></div>
  ${standfirst ? `<p class="standfirst">${standfirst}</p>` : ''}
</header>`;
}

const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * Wraps a long text page with an "On this page" list built from its h2
 * headings, so every section is one tap away. Headings without an id get
 * one. On wide screens the list sits beside the text and stays in view;
 * on a phone it's a collapsed list at the top.
 */
export function withContents(html) {
  const items = [];
  const body = html.replace(/<h2( id="([^"]+)")?>([\s\S]*?)<\/h2>/g, (m, _a, id, text) => {
    const anchor = id || slug(text);
    items.push([anchor, text.replace(/<[^>]+>/g, '')]);
    return `<h2 id="${anchor}">${text}</h2>`;
  });
  if (items.length < 3) return `<article class="prose">\n${body}\n</article>`;

  return `<div class="with-toc">
<nav class="toc" aria-label="On this page">
  <details>
    <summary>On this page</summary>
    <ol>
${items.map(([a, t]) => `      <li><a href="#${a}">${esc(t).replace(/&amp;([a-z]+;)/g, '&$1')}</a></li>`).join('\n')}
    </ol>
  </details>
</nav>
<article class="prose">
${body}
</article>
</div>
<script>
  // Open the contents list where there's room to show it beside the text.
  if (window.matchMedia('(min-width: 60rem)').matches) {
    document.querySelector('.toc details').open = true;
  }
</script>`;
}
