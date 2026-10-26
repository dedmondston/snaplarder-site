/**
 * privacy.html, terms.html and food-safety.html, generated from the
 * app's src/services/legal.js — the same text the app shows. Edit the
 * wording there, then rebuild; never edit these three pages by hand.
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { page, heading, esc, withContents } from './page.mjs';

const HEADING_RE = /^(\d+\.\s+)?[A-Z][A-Z ,'’&-]+$/;

/** "WHAT THE APP STORES" -> "What the app stores"; keeps "1. " numbering. */
function sentenceCase(h) {
  const lower = h.toLowerCase();
  return lower.replace(/^(\d+\.\s+)?([a-z])/, (_, n = '', c) => n + c.toUpperCase());
}

function anchorFor(h) {
  return sentenceCase(h)
    .replace(/^\d+\.\s+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const KNOWN_LINKS = [
  // Plain words worth linking, in the order they're tried.
  [/\bFood Standards Agency\b/g, 'https://www.food.gov.uk'],
  [/\bInformation Commissioner's Office\b/g, 'https://ico.org.uk'],
];

/** Escapes, then turns emails, URLs and bare domains into links. */
function linkify(text, headings) {
  let s = esc(text);

  s = s.replace(/\b([a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi, '<a href="mailto:$1">$1</a>');

  // Full https:// URLs and bare domains such as openfoodfacts.org.
  s = s.replace(
    /(?<![@\w/.])((?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:org\.uk|co\.uk|gov\.au|org\.nz|gov\.za|org\.za|co\.za|com|org|gov|uk|ie)(?:\/[a-z0-9\/._-]*)?)/gi,
    (m) => {
      const trimmed = m.replace(/[.]+$/, '');
      const rest = m.slice(trimmed.length);
      const href = /^https?:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
      return `<a href="${href}">${trimmed}</a>${rest}`;
    }
  );

  for (const [re, href] of KNOWN_LINKS) s = s.replace(re, (m) => `<a href="${href}">${m}</a>`);

  // Cross-references written in capitals, e.g. "described under PURCHASES".
  for (const h of headings) {
    const plain = esc(h.text);
    if (!/[A-Z]{4,}/.test(plain)) continue;
    s = s.split(` ${plain}`).join(` <a href="#${h.anchor}">${esc(sentenceCase(h.text))}</a>`);
  }
  return s;
}

/**
 * Plain text to HTML. Blocks are separated by blank lines; a block that
 * is a capitalised line becomes a heading; lines starting "•" become a
 * list, and neighbouring list blocks are merged into one list.
 */
export function textToHtml(text, { skipLines = 0 } = {}) {
  const lines = text.split('\n').slice(skipLines);
  const blocks = lines.join('\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  const headings = blocks
    .filter((b) => !b.includes('\n') && HEADING_RE.test(b))
    .map((b) => ({ text: b, anchor: anchorFor(b) }));

  const out = [];
  let list = null;
  for (const b of blocks) {
    const bLines = b.split('\n');
    if (bLines.every((l) => l.trim().startsWith('•'))) {
      list ??= [];
      for (const l of bLines) list.push(`    <li>${linkify(l.replace(/^\s*•\s*/, ''), headings)}</li>`);
      continue;
    }
    if (list) {
      out.push(`  <ul>\n${list.join('\n')}\n  </ul>`);
      list = null;
    }
    if (bLines.length === 1 && HEADING_RE.test(b)) {
      out.push(`  <h2 id="${anchorFor(b)}">${esc(sentenceCase(b))}</h2>`);
    } else {
      out.push(`  <p>${bLines.map((l) => linkify(l, headings)).join('<br>\n  ')}</p>`);
    }
  }
  if (list) out.push(`  <ul>\n${list.join('\n')}\n  </ul>`);
  return out.join('\n');
}

export async function buildLegal(siteRoot, legal) {
  const docs = [
    {
      path: 'privacy.html',
      title: 'Privacy policy',
      description: `How ${legal.APP_NAME} handles your data. Short version: it stays on your phone.`,
      text: legal.PRIVACY_POLICY,
      skip: 2,
      updated: true,
    },
    {
      path: 'terms.html',
      title: 'Terms of use',
      description: `The terms for using ${legal.APP_NAME}: what it is, the free trial and unlock, and your rights.`,
      text: legal.TERMS_OF_USE,
      skip: 2,
      updated: true,
    },
    {
      path: 'food-safety.html',
      title: 'Food safety notice',
      description: `${legal.APP_NAME} gives reminders, not food safety advice. What its dates mean and their limits.`,
      text: legal.SAFETY_DISCLAIMER_FULL,
      skip: 0,
      intro: `This is the notice ${esc(legal.APP_NAME)} shows when you first open it. It applies to the app and to the food guide on this website.`,
    },
  ];

  for (const d of docs) {
    const body = [
      heading(d.title),
      d.updated ? `<p class="updated">Last updated ${esc(legal.LAST_UPDATED)}</p>` : '',
      d.intro ? `<p class="updated">${d.intro}</p>` : '',
      withContents(textToHtml(d.text, { skipLines: d.skip })),
    ].filter(Boolean).join('\n\n');

    const html = page({
      path: d.path,
      title: `${d.title} — ${legal.APP_NAME}`,
      description: d.description,
      body,
    });
    await writeFile(path.join(siteRoot, d.path), html, 'utf8');
  }
  return docs.map((d) => d.path);
}
