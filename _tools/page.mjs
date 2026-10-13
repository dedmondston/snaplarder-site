/**
 * The shell every generated page shares: head, App Store banner,
 * header and footer. index.html, support.html and 404.html are written
 * by hand but follow the same pattern; keep them in step if this changes.
 */

export const SITE = 'https://snaplarder.com';
export const APP_STORE_ID = '6803253210';
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} p
 * @param {string} p.path        site path of this page, e.g. 'food/milk.html'
 * @param {string} p.title       <title>
 * @param {string} p.description meta description
 * @param {string} p.body        everything inside <main>
 * @param {string} [p.mainClass] extra class on <main>, e.g. 'doc'
 * @param {string} [p.extraHead] anything else for <head>
 */
export function page({ path, title, description, body, mainClass = '', extraHead = '' }) {
  // Relative links, so the pages also work when opened from disk.
  const up = '../'.repeat(path.split('/').length - 1);
  const url = `${SITE}/${path.replace(/(^|\/)index\.html$/, '$1')}`;

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
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
<link rel="stylesheet" href="${up}style.css">
${extraHead}</head>
<body>
<main class="page ${mainClass}">

  <a class="back" href="${up || './'}">← SnapLarder</a>

${body}

${footer(up)}

</main>
</body>
</html>
`;
}

export function footer(up = '') {
  return `  <footer>
    <a href="${up || './'}">SnapLarder</a>
    <a href="${up}food/">Food guide</a>
    <a href="${up}support.html">Support</a>
    <a href="${up}food-safety.html">Food safety</a>
    <a href="${up}privacy.html">Privacy</a>
    <a href="${up}terms.html">Terms</a>
  </footer>`;
}

export function heading(title) {
  return `  <h1 class="wordmark page-title">${esc(title)}</h1>
  <div class="scale" aria-hidden="true"><span></span><span></span><span></span></div>`;
}
