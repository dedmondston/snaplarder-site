/**
 * The food guide: /food/ and one page per food, generated from the
 * app's own shelf-life table (assets/expiryData.json) and the app's own
 * rules for where food is kept, how long it lasts opened and frozen.
 * Change a number in the app and rebuild; the site follows.
 *
 * Where the website deliberately says less than the app, it's listed
 * below with the reason. It never shows a figure the app doesn't use.
 */

import { writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { page, heading, esc, APP_STORE_URL } from './page.mjs';

/** British names for the app's (largely American) table keys. */
const NAMES = {
  arugula: { name: 'Rocket', aka: 'arugula' },
  romaine: { name: 'Cos lettuce', aka: 'romaine' },
  zucchini: { name: 'Courgettes', aka: 'zucchini' },
  'bell pepper': { name: 'Peppers', aka: 'bell peppers' },
  tomato: { name: 'Tomatoes' },
  avocado: { name: 'Avocados' },
  banana: { name: 'Bananas' },
  apple: { name: 'Apples' },
  orange: { name: 'Oranges' },
  lemon: { name: 'Lemons' },
  lime: { name: 'Limes' },
  mango: { name: 'Mangoes' },
  cantaloupe: { name: 'Cantaloupe melon' },
  peach: { name: 'Peaches' },
  plum: { name: 'Plums' },
  pear: { name: 'Pears' },
  kiwi: { name: 'Kiwi fruit' },
  onion: { name: 'Onions' },
  potato: { name: 'Potatoes' },
  'sweet potato': { name: 'Sweet potatoes' },
  corn: { name: 'Sweetcorn', aka: 'corn on the cob' },
  beets: { name: 'Beetroot', aka: 'beets' },
  radish: { name: 'Radishes' },
  scallions: { name: 'Spring onions', aka: 'scallions' },
  'herbs (basil)': { name: 'Fresh basil' },
  'herbs (cilantro)': { name: 'Fresh coriander', aka: 'cilantro' },
  'herbs (parsley)': { name: 'Fresh parsley' },
  'greek yogurt': { name: 'Greek yoghurt' },
  yogurt: { name: 'Yoghurt' },
  'cheddar block': { name: 'Cheddar' },
  'shredded cheese': { name: 'Grated cheese', aka: 'shredded cheese' },
  'sour cream': { name: 'Soured cream', aka: 'sour cream' },
  'heavy cream': { name: 'Double cream', aka: 'heavy cream' },
  'chicken breast': { name: 'Chicken breasts' },
  'ground beef': { name: 'Beef mince', aka: 'ground beef' },
  'ground turkey': { name: 'Turkey mince', aka: 'ground turkey' },
  sausage: { name: 'Sausages' },
  shrimp: { name: 'Prawns', aka: 'shrimp' },
  'white fish': { name: 'White fish', aka: 'cod, haddock or pollock' },
  'deli turkey': { name: 'Sliced turkey', aka: 'deli turkey' },
  'deli ham': { name: 'Sliced ham', aka: 'deli ham' },
  'hot dogs': { name: 'Hot dog sausages' },
  tortillas: { name: 'Tortilla wraps' },
  rice: { name: 'Rice', aka: 'uncooked' },
  pasta: { name: 'Dried pasta' },
  'canned beans': { name: 'Tinned beans', aka: 'canned beans' },
  'canned tomatoes': { name: 'Tinned tomatoes', aka: 'canned tomatoes' },
  cereal: { name: 'Breakfast cereal' },
  'salsa (fresh)': { name: 'Fresh salsa' },
  'coffee (ground)': { name: 'Ground coffee' },
  'boiled eggs': { name: 'Hard-boiled eggs' },
  'cooked potatoes': { name: 'Cooked potatoes', aka: 'mashed, roast or boiled' },
  'flavoured butter': { name: 'Flavoured butter', aka: 'garlic or brandy butter' },
};

/**
 * Foods whose other name is what people in the US (and often Australia)
 * search for. It goes in the page title, "How long do courgettes
 * (zucchini) last?", so one page answers both searches. Only true
 * alternative names: an aka that describes the food ("uncooked",
 * "mashed, roast or boiled") stays out of the title.
 */
const NAME_IN_TITLE = new Set([
  'arugula', 'romaine', 'zucchini', 'bell pepper', 'beets', 'scallions',
  'herbs (cilantro)', 'shredded cheese', 'sour cream', 'heavy cream',
  'ground beef', 'ground turkey', 'shrimp', 'deli turkey', 'deli ham',
  'canned beans', 'canned tomatoes',
]);

/**
 * Left out of the guide. "Half and half" isn't sold in the UK; the two
 * "(opened)" entries are already opened-life figures, so a page would
 * apply opening twice.
 */
const SKIP = new Set(['half and half', 'salsa (jarred, opened)', 'broth (opened)']);

/**
 * "Once opened" is shown only where opening actually shortens the time,
 * e.g. not for eggs, whose opened figure equals their normal one.
 */
const showOpened = (f) => f.opened < f.days;

/** Foods that change texture badly when frozen: no freezer time shown. */
const NO_FREEZE = new Set([
  'lettuce', 'romaine', 'arugula', 'cucumber', 'celery', 'radish', 'watermelon',
  'cantaloupe', 'potato', 'sweet potato', 'avocado', 'eggs', 'yogurt',
  'greek yogurt', 'sour cream', 'cream cheese', 'cottage cheese', 'tomato',
  'cherry tomatoes', 'guacamole', 'salsa (fresh)', 'mayonnaise',
  'boiled eggs', 'scotch eggs', 'overnight oats',
]);

/** Cupboard foods worth freezing; other cupboard staples don't need it. */
const FREEZE_FROM_CUPBOARD = new Set(['bread', 'bagels', 'tortillas', 'banana', 'mango', 'pineapple', 'peach', 'plum']);

const showFreezer = (f) =>
  !NO_FREEZE.has(f.key) && (f.location !== 'pantry' || FREEZE_FROM_CUPBOARD.has(f.key));

/** Foods you make rather than buy: dated from cooking, not from the shop. */
const COOKED = new Set(['cooked rice', 'cooked pasta', 'cooked potatoes', 'boiled eggs', 'leftovers']);

/** Extra lines for a few foods, kept short and factual. */
const NOTES = {
  rice: 'This is uncooked rice. <a href="cooked-rice.html">Cooked rice</a> is different: eat it within a day.',
  pasta: 'This is dried pasta. <a href="fresh-pasta.html">Fresh pasta</a> from the chiller cabinet keeps for days, not years.',
  'cooked rice': 'Cool it quickly, keep it in the fridge and eat it within a day. Only reheat it once.',
  'fresh pasta': 'This is fresh pasta from the chiller cabinet. <a href="dried-pasta.html">Dried pasta</a> keeps for years.',
  eggs: 'UK supermarkets often sell eggs unchilled, but keeping them in the fridge helps them last.',
  leftovers: 'Two days is the UK’s advice and the strictest of the countries SnapLarder covers. Ireland’s safefood says 3 days, and the USDA 3 to 4. Put leftovers in the fridge within 2 hours, and reheat them only once, until steaming hot. Holiday guides: <a href="../christmas-leftovers.html">Christmas leftovers</a> · <a href="../thanksgiving-leftovers.html">Thanksgiving leftovers</a>',
};

const CATEGORIES = [
  ['produce', 'Fruit and vegetables'],
  ['dairy', 'Dairy and eggs'],
  ['protein', 'Meat, fish and tofu'],
  ['pantry', 'Cupboard, bread and dips'],
];

const WHERE = { fridge: 'the fridge', freezer: 'the freezer', pantry: 'the cupboard' };
const WHERE_SHORT = { fridge: 'Fridge', freezer: 'Freezer', pantry: 'Cupboard' };

/** 3 -> "3 days", 21 -> "about 3 weeks", 240 -> "about 8 months", 730 -> "about 2 years". */
export function duration(d) {
  if (d === 1) return '1 day';
  if (d < 14) return `${d} days`;
  if (d < 60) return `about ${Math.round(d / 7)} weeks`;
  const months = Math.round(d / 30.4);
  if (months === 12) return 'about a year';
  if (d < 730) return `about ${months} months`;
  return `about ${Math.round(d / 365)} years`;
}

/** The short form for the overview lists: 3 days, 3 wks, 8 mths, 2 yrs. */
export function shortDuration(d) {
  if (d === 1) return '1 day';
  if (d < 14) return `${d} days`;
  if (d < 60) return `${Math.round(d / 7)} wks`;
  const months = Math.round(d / 30.4);
  if (months === 12) return '1 yr';
  if (d < 730) return `${months} mths`;
  return `${Math.round(d / 365)} yrs`;
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** "Courgettes" -> plural, "Hummus" -> not. Decides "does" or "do". */
function isPlural(name) {
  const last = name.toLowerCase().split(' ').pop();
  if (['hummus', 'asparagus', 'couscous', 'oats'].includes(last)) return last === 'oats';
  return last.endsWith('s') && !last.endsWith('ss');
}

/**
 * Every other name the app knows for each table entry, from the app's
 * own foodNames.js: capsicum, rockmelon, boerewors, rashers... Used by
 * the food finder, so someone in Sydney typing "capsicum" finds peppers.
 */
function otherNames(app) {
  const byKey = {};
  for (const [alias, key] of Object.entries(app.NAME_EQUIVALENTS ?? {})) {
    (byKey[key] ??= []).push(alias);
  }
  return byKey;
}

export function buildFoodList(table, app) {
  const foods = [];
  const aliases = otherNames(app);
  for (const [category, items] of Object.entries(table)) {
    for (const [key, days] of Object.entries(items)) {
      if (SKIP.has(key)) continue;
      const display = NAMES[key] ?? { name: key.charAt(0).toUpperCase() + key.slice(1) };
      const location = app.locationFor({ name: key, category });
      foods.push({
        key,
        category,
        days,
        location,
        name: display.name,
        aka: display.aka ?? null,
        titleName: NAME_IN_TITLE.has(key) && display.aka ? `${display.name} (${display.aka})` : display.name,
        aliases: aliases[key] ?? [],
        slug: slugify(display.name),
        opened: app.openedDaysFor({ name: key, category }),
        frozen: app.freezerDaysFor(category, key),
        thawed: app.thawedDaysFor({ name: key }),
      });
    }
  }
  foods.sort((a, b) => a.name.localeCompare(b.name));

  const seen = new Set();
  for (const f of foods) {
    if (seen.has(f.slug)) throw new Error(`Two foods would share the page food/${f.slug}.html`);
    seen.add(f.slug);
  }
  return foods;
}

const catLabel = (c) => CATEGORIES.find(([k]) => k === c)[1];

/** The four category jump links, used on every food page and the index. */
function categoryChips(prefix) {
  return `<ul class="chips">
${CATEGORIES.map(([c, label]) => `  <li><a href="${prefix}#${c}">${esc(label)}</a></li>`).join('\n')}
</ul>`;
}

function foodPage(f, foods) {
  const verb = isPlural(f.name) ? 'do' : 'does';
  const lname = lowerFirst(f.name);
  const title = `How long ${verb} ${lowerFirst(f.titleName)} last?`;
  const where = WHERE[f.location];
  const keeps = duration(f.days);
  const opened = f.category === 'produce' ? 'Once cut' : 'Once opened';

  const rows = [
    [`${COOKED.has(f.key) ? 'Once cooked' : 'As bought'}, in ${where}`, keeps, f.days],
    showOpened(f) ? [opened, duration(f.opened), f.opened] : null,
    showFreezer(f) && f.location !== 'freezer' ? ['In the freezer', duration(f.frozen), f.frozen] : null,
    showFreezer(f) ? ['After thawing', `use within ${duration(f.thawed)}`, f.thawed] : null,
  ].filter(Boolean);

  const lines = [];
  lines.push(`${f.name} ${verb === 'do' ? 'keep' : 'keeps'} for ${keeps} in ${where}, counted from when you ${COOKED.has(f.key) ? 'cook' : 'buy'} ${verb === 'do' ? 'them' : 'it'}. That's SnapLarder's estimate for ${lname}${f.aka ? ` (${esc(f.aka)})` : ''} in general. If the packet has a date, go by the packet: it's specific to that product.`);
  if (f.category === 'pantry' && f.location === 'pantry') {
    lines.push('Once opened, check the label: some products need to go in the fridge.');
  }
  if (NOTES[f.key]) lines.push(NOTES[f.key]);
  if (f.category === 'protein' || f.category === 'dairy') {
    lines.push('A use-by date is about safety. Don’t eat food after its use-by date, even if it looks and smells fine. <a href="../use-by-vs-best-before.html">Use by vs best before</a>');
  }

  // "Can you freeze courgettes?" is one of the commonest food searches,
  // so every page answers it under its own heading, from the same
  // figures as the table above.
  const them = verb === 'do' ? 'them' : 'it';
  let freeze;
  if (f.location === 'freezer') {
    freeze = `Yes: ${lname} ${verb === 'do' ? 'belong' : 'belongs'} in the freezer, where ${verb === 'do' ? 'they keep' : 'it keeps'} for ${keeps}.`;
  } else if (NO_FREEZE.has(f.key)) {
    freeze = `Not really. ${f.name} ${verb === 'do' ? "don't" : "doesn't"} freeze well: the texture changes when ${verb === 'do' ? 'they thaw' : 'it thaws'}.`;
  } else if (!showFreezer(f)) {
    freeze = `There's no need. ${f.name} already ${verb === 'do' ? 'keep' : 'keeps'} for ${keeps} in ${where}.`;
  } else {
    freeze = `Yes. ${f.name} ${verb === 'do' ? 'keep' : 'keeps'} for ${duration(f.frozen)} in the freezer. Freeze ${them} ${COOKED.has(f.key) ? 'as soon as ' + (verb === 'do' ? 'they have' : 'it has') + ' cooled' : 'before the date on the packet'}, defrost ${them} in the fridge, and use ${them} within ${duration(f.thawed)} of thawing.`;
  }
  const freezeTitle = `Can you freeze ${lname}?`;

  // The eight foods either side of this one, alphabetically, in its category.
  const same = foods.filter((o) => o.category === f.category && o.slug !== f.slug);
  const at = same.findIndex((o) => o.name.localeCompare(f.name) > 0);
  const start = Math.max(0, Math.min(same.length - 8, (at < 0 ? same.length : at) - 4));
  const related = same.slice(start, start + 8);

  const body = `<div class="food-layout">
<div class="food-main">
<div class="food-hero">${badge(f)}${heading(title)}</div>

<section class="demo" aria-label="${esc(f.name)} at a glance">
  <p class="demo-item">${esc(f.name)}</p>
${rows.map(([k, v, d]) => `  <div class="demo-row"><span>${esc(k)}</span><b class="demo-when">${esc(v)}</b></div>\n  <span class="life life-${urgency(d)}" aria-hidden="true"><i style="width:${barWidth(d)}%"></i></span>`).join('\n')}
  <p class="demo-note">${showOpened(f) ? 'Opening never extends a date: if the packet date comes sooner, go by that. ' : ''}Estimates for quality, not a safety ruling. <a href="../use-by-vs-best-before.html">What the dates mean</a></p>
</section>

${lines.map((l) => `<p>${l}</p>`).join('\n')}

<h2>${esc(freezeTitle)}</h2>
<p>${freeze}</p>
</div>

<aside class="food-side" aria-label="Quick links">
  <section class="card">
    <h2>Let your phone keep track</h2>
    <p>Scan the barcode or photograph the label. SnapLarder dates it, moves the date when you open or freeze it, and reminds you before it goes off.</p>
    <a class="cta" href="${APP_STORE_URL}">Download on the App Store</a>
  </section>
  <section>
    <h2>More ${esc(catLabel(f.category).toLowerCase())}</h2>
    <ul class="chips">
${related.map((o) => `      <li><a href="${o.slug}.html">${esc(o.name)}</a></li>`).join('\n')}
    </ul>
  </section>
  <section>
    <h2>All foods</h2>
    ${categoryChips('./')}
  </section>
</aside>
</div>`;

  return page({
    path: `food/${f.slug}.html`,
    title: `${title} — SnapLarder food guide`,
    description: `${f.name} ${verb === 'do' ? 'keep' : 'keeps'} for ${keeps} in ${where}.${showOpened(f) ? ` Once opened: ${duration(f.opened)}.` : ''}${showFreezer(f) && f.location !== 'freezer' ? ` Frozen: ${duration(f.frozen)}.` : ''} Typical times, and when to go by the packet.`,
    body,
  });
}

/** A picture for each food where a clear emoji exists; otherwise a letter badge. */
const EMOJI = {
  'cooked potatoes': '🥔', spinach: '🥬', lettuce: '🥬', kale: '🥬', arugula: '🥬', romaine: '🥬',
  carrots: '🥕', cucumber: '🥒', zucchini: '🥒', broccoli: '🥦', 'bell pepper': '🫑', tomato: '🍅',
  'cherry tomatoes': '🍅', avocado: '🥑', banana: '🍌', apple: '🍎', orange: '🍊', lemon: '🍋',
  grapes: '🍇', strawberries: '🍓', blueberries: '🫐', mango: '🥭', pineapple: '🍍', watermelon: '🍉',
  cantaloupe: '🍈', peach: '🍑', pear: '🍐', kiwi: '🥝', onion: '🧅', garlic: '🧄', potato: '🥔',
  'sweet potato': '🍠', mushrooms: '🍄', corn: '🌽', cabbage: '🥬',
  'herbs (basil)': '🌿', 'herbs (cilantro)': '🌿', 'herbs (parsley)': '🌿',
  'boiled eggs': '🥚', 'scotch eggs': '🥚', eggs: '🥚', 'flavoured butter': '🧈', butter: '🧈',
  milk: '🥛', 'heavy cream': '🥛', 'cheddar block': '🧀', 'shredded cheese': '🧀', 'cream cheese': '🧀',
  'cottage cheese': '🧀', parmesan: '🧀',
  'chicken thighs': '🍗', 'chicken breast': '🍗', 'ground beef': '🥩', steak: '🥩', 'pork chops': '🥩',
  bacon: '🥓', sausage: '🌭', 'hot dogs': '🌭', salmon: '🐟', 'white fish': '🐟', shrimp: '🦐',
  'deli turkey': '🥪', 'deli ham': '🥪',
  'cooked rice': '🍚', rice: '🍚', 'fresh pasta': '🍝', 'cooked pasta': '🍝', pasta: '🍝',
  'overnight oats': '🥣', oats: '🥣', cereal: '🥣', bread: '🍞', tortillas: '🌯', bagels: '🥯',
  'canned beans': '🥫', 'canned tomatoes': '🥫', 'peanut butter': '🥜', 'olive oil': '🫒', honey: '🍯',
  'hot sauce': '🌶️', guacamole: '🥑', pesto: '🌿', 'coffee (ground)': '☕', 'tea bags': '🍵', leftovers: '🍲',
};

const CAT_EMOJI = { produce: '🍎', dairy: '🧀', protein: '🍗', pantry: '🥫' };

/** The food's picture, or its first letter in the category colour. */
export function badge(f) {
  const e = EMOJI[f.key];
  return e
    ? `<span class="badge" aria-hidden="true">${e}</span>`
    : `<span class="badge badge-${f.category}" aria-hidden="true">${esc(f.name.charAt(0))}</span>`;
}

/**
 * How full the shelf-life bar is: a log scale from 1 day to about 3
 * years, so 2 days and 2 weeks look clearly different, and 1 year and
 * 2 years don't swamp everything else.
 */
export function barWidth(days) {
  return Math.max(6, Math.min(100, Math.round((Math.log(days + 1) / Math.log(1100)) * 100)));
}

/** The freshness colour the app uses: red for days, amber for weeks, green beyond. */
export function urgency(days) {
  return days <= 3 ? 'spoil' : days <= 14 ? 'soon' : 'fresh';
}

/** One stat in a card: a short figure on screen, the full wording for screen readers. */
function stat(label, days, prefix = '') {
  return `<span class="fc-stat"><span class="fc-label">${label}</span><b><span aria-hidden="true">${shortDuration(days)}</span><span class="sr">${esc(label)}: ${prefix}${esc(duration(days))}</span></b></span>`;
}

/** A stat that doesn't apply, with the reason for screen readers and on hover. */
function noStat(label, why) {
  return `<span class="fc-stat fc-none" title="${esc(why)}"><span class="fc-label">${label}</span><b><span aria-hidden="true">–</span><span class="sr">${esc(label)}: ${esc(why)}</span></b></span>`;
}

function foodCard(f) {
  const search = [f.name, f.aka ?? '', f.key, ...f.aliases].join(' ').toLowerCase();
  const canFreeze = showFreezer(f);
  const why = NO_FREEZE.has(f.key) ? "doesn't freeze well" : 'no need to freeze';
  const stats = [
    stat(WHERE_SHORT[f.location], f.days),
    canFreeze && f.location !== 'freezer' ? stat('Freezer', f.frozen) : noStat('Freezer', why),
    canFreeze ? stat('Thawed', f.thawed, 'use within ') : noStat('Thawed', why),
  ].join('');
  return `    <li class="food-card" data-name="${esc(search)}" data-where="${f.location}" data-days="${f.days}" data-freeze="${canFreeze ? 1 : 0}" data-frozen="${canFreeze && f.location !== 'freezer' ? f.frozen : 0}">
      <a href="${f.slug}.html">
        <span class="fc-head">${badge(f)}<b class="fc-name">${esc(f.name)}</b></span>
        <span class="fc-stats">${stats}</span>
        <span class="life life-${urgency(f.days)}" aria-hidden="true"><i style="width:${barWidth(f.days)}%"></i></span>
      </a>
    </li>`;
}

function indexPage(foods) {
  const byCat = (cat) => foods.filter((f) => f.category === cat);

  const tiles = CATEGORIES.map(([cat, label]) => {
    const list = byCat(cat);
    const sample = list.filter((f) => EMOJI[f.key]).slice(0, 5).map((f) => EMOJI[f.key]).join(' ');
    return `  <li><a class="cat-tile cat-${cat}" href="#${cat}">
    <span class="cat-emoji" aria-hidden="true">${CAT_EMOJI[cat]}</span>
    <b>${esc(label)}</b>
    <span class="cat-count">${list.length} foods</span>
    <span class="cat-sample" aria-hidden="true">${sample}</span>
  </a></li>`;
  }).join('\n');

  // Quick answers: what to eat first, and what you can forget about.
  const first = foods.filter((f) => f.days <= 3 && f.location !== 'freezer').sort((a, b) => a.days - b.days || a.name.localeCompare(b.name));
  const long = foods.filter((f) => f.days >= 365).sort((a, b) => b.days - a.days || a.name.localeCompare(b.name));
  const chip = (f) => `<li><a href="${f.slug}.html">${EMOJI[f.key] ? `<span aria-hidden="true">${EMOJI[f.key]}</span> ` : ''}${esc(f.name)}</a></li>`;

  const sections = CATEGORIES.map(([cat, label]) => {
    const list = byCat(cat);
    return `<section class="food-section" aria-labelledby="${cat}">
  <h2 id="${cat}"><span aria-hidden="true">${CAT_EMOJI[cat]}</span> ${esc(label)} <span class="count">${list.length}</span></h2>
  <ul class="food-cards">
${list.map(foodCard).join('\n')}
  </ul>
</section>`;
  }).join('\n');

  const body = `<div class="food-top">
${heading('How long does food last?', `Typical times for ${foods.length} everyday foods, in the fridge, freezer and cupboard. Tap a food for opened and frozen times.`)}
<p class="aside">
  <b>Use-by or best before?</b> A use-by date is about safety: don't eat
  food after it, even if it looks and smells fine. A best-before date is
  about quality. These times are general estimates; when the packet has a
  date, go by the packet. <a href="../use-by-vs-best-before.html">More on date labels</a>
  · <a href="../sell-by-vs-use-by-vs-best-by.html">US date labels</a>
</p>
</div>

<nav aria-label="Food categories">
<ul class="cat-tiles">
${tiles}
</ul>
</nav>

<div class="quick">
  <section class="card quick-card quick-first">
    <h2>Eat these first</h2>
    <p>Keep for 3 days or less once home, so plan to use them early.</p>
    <ul class="chips">${first.map(chip).join('')}</ul>
  </section>
  <section class="card quick-card quick-long">
    <h2>Keep for a year or more</h2>
    <p>Cupboard staples you can stop worrying about.</p>
    <ul class="chips">${long.map(chip).join('')}</ul>
  </section>
</div>

<div class="food-tools" role="search">
  <div class="food-filter" hidden>
    <label for="food-filter">Find a food</label>
    <input id="food-filter" type="search" placeholder="e.g. hummus" autocomplete="off">
  </div>
  <fieldset class="seg" hidden>
    <legend>Kept in</legend>
    <label><input type="radio" name="where" value="" checked><span>All</span></label>
    <label><input type="radio" name="where" value="fridge"><span>Fridge</span></label>
    <label><input type="radio" name="where" value="pantry"><span>Cupboard</span></label>
    <label><input type="radio" name="where" value="freeze"><span>Freezable</span></label>
  </fieldset>
  <div class="sort" hidden>
    <label for="food-sort">Sort</label>
    <select id="food-sort">
      <option value="name">A to Z</option>
      <option value="short">Use soonest first</option>
      <option value="long">Keeps longest first</option>
      <option value="frozen">Keeps longest frozen</option>
    </select>
  </div>
</div>
<p class="legend"><b>Fridge or Cupboard</b> = as bought · <b>Freezer</b> = if you freeze it · <b>Thawed</b> = use within, once defrosted.<br><span class="life life-spoil" aria-hidden="true"><i style="width:30%"></i></span> days <span class="life life-soon" aria-hidden="true"><i style="width:55%"></i></span> weeks <span class="life life-fresh" aria-hidden="true"><i style="width:85%"></i></span> months or more</p>
<p class="food-none" hidden>Nothing matches. Try another name.</p>

${sections}

<section class="card home-cta">
  <h2>Let your phone keep track</h2>
  <p>SnapLarder uses these same figures. Scan your shopping and it dates each item, moves the date when you open or freeze it, and reminds you before it goes off.</p>
  <a class="cta" href="${APP_STORE_URL}">Download on the App Store</a>
</section>

<script>
  // Search, filter and sort. Without script, every food still shows, A to Z.
  (function () {
    var input = document.getElementById('food-filter');
    var sort = document.getElementById('food-sort');
    var none = document.querySelector('.food-none');
    document.querySelectorAll('.food-tools [hidden]').forEach(function (el) { el.hidden = false; });

    function where() {
      var r = document.querySelector('input[name=where]:checked');
      return r ? r.value : '';
    }

    function apply() {
      var q = input.value.trim().toLowerCase();
      var w = where();
      var shown = 0;
      document.querySelectorAll('.food-section').forEach(function (sec) {
        var list = sec.querySelector('.food-cards');
        var items = Array.prototype.slice.call(list.children);
        items.sort(function (a, b) {
          if (sort.value === 'short') return a.dataset.days - b.dataset.days || a.dataset.name.localeCompare(b.dataset.name);
          if (sort.value === 'frozen') return (b.dataset.frozen || 0) - (a.dataset.frozen || 0) || a.dataset.name.localeCompare(b.dataset.name);
          if (sort.value === 'long') return b.dataset.days - a.dataset.days || a.dataset.name.localeCompare(b.dataset.name);
          return a.dataset.name.localeCompare(b.dataset.name);
        });
        var any = 0;
        items.forEach(function (li) {
          var hit = (!q || li.dataset.name.indexOf(q) !== -1) && (!w || (w === 'freeze' ? li.dataset.freeze === '1' : li.dataset.where === w));
          li.hidden = !hit;
          if (hit) any++;
          list.appendChild(li);
        });
        sec.hidden = !any;
        shown += any;
      });
      none.hidden = shown > 0;
    }

    input.addEventListener('input', apply);
    sort.addEventListener('change', apply);
    document.querySelectorAll('input[name=where]').forEach(function (r) { r.addEventListener('change', apply); });

    // Arriving from the home page search: food/?q=hummus
    var q0 = new URLSearchParams(location.search).get('q');
    if (q0) input.value = q0;
    apply();
  })();
</script>`;

  return page({
    path: 'food/index.html',
    title: 'How long does food last? Fridge, freezer and cupboard times — SnapLarder',
    description: `How long ${foods.length} everyday foods keep in the fridge, freezer and cupboard, once opened and once frozen. Plus use-by versus best before.`,
    body,
  });
}

export async function buildFood(siteRoot, table, app) {
  const foods = buildFoodList(table, app);
  const dir = path.join(siteRoot, 'food');
  await mkdir(dir, { recursive: true });

  // Remove pages for foods that have left the table, so nothing stale is published.
  const keep = new Set(['index.html', ...foods.map((f) => `${f.slug}.html`)]);
  for (const file of await readdir(dir)) {
    if (file.endsWith('.html') && !keep.has(file)) await unlink(path.join(dir, file));
  }

  for (const f of foods) await writeFile(path.join(dir, `${f.slug}.html`), foodPage(f, foods), 'utf8');
  await writeFile(path.join(dir, 'index.html'), indexPage(foods), 'utf8');
  return ['food/index.html', ...foods.map((f) => `food/${f.slug}.html`)];
}
