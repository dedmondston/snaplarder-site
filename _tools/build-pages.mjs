/**
 * index.html, support.html and 404.html, from the editable content in
 * _tools/pages/. Edit the content there; this wraps it in the shared
 * page shell so every page has the same navigation.
 *
 * The first line of each file is a comment holding its settings as JSON:
 * title, description, and optionally heading (adds a page title),
 * contents (adds an "On this page" list), absolute and noindex.
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { page, heading, withContents } from './page.mjs';

const PAGES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pages');

export async function buildPages(siteRoot) {
  const built = [];
  for (const file of (await readdir(PAGES)).filter((f) => f.endsWith('.html'))) {
    const src = await readFile(path.join(PAGES, file), 'utf8');
    const m = /^<!--\s*(\{[\s\S]*?\})\s*-->\s*/.exec(src);
    if (!m) throw new Error(`_tools/pages/${file} must start with its settings, e.g. <!-- {"title": "...", "description": "..."} -->`);
    const meta = JSON.parse(m[1]);
    let body = src.slice(m[0].length).trim();
    if (meta.contents) body = withContents(body);
    if (meta.heading) body = `${heading(meta.heading)}\n\n${body}`;

    await writeFile(
      path.join(siteRoot, file),
      page({ path: file, title: meta.title, description: meta.description, body, absolute: !!meta.absolute, noindex: !!meta.noindex }),
      'utf8'
    );
    built.push(file);
  }
  return built;
}
