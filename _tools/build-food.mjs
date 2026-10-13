/**
 * The food guide: /food/ and one page per food, generated from the
 * app's own shelf-life table (assets/expiryData.json) and the app's own
 * rules for where food is kept, how long it lasts opened and frozen.
 * Change a number in the app and rebuild; the site follows.
 *
 * Where the website deliberately says less than the app, it's listed
 * below with the reason. It never shows a longer time than the app.
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
};

/**
 * Left out of the guide. "Half and half" isn't sold in the UK; the two
 * "(opened)" entries are already opened-life figures, so a page would
 * apply opening twice.
 */
const SKIP = new Set(['half and half', 'salsa (jarred, opened)', 'broth (opened)']);

/**
 * Chilled foods the app's rules currently place in the cupboard,
 * because they sit in the "pantry" category. Shown as fridge here.
 * TODO in the app: storageLocation.js should send these to the fridge.
 */
const CHILLED = new Set(['hummus', 'guacamole', 'pesto', 'salsa (fresh)']);

/**
 * "Once opened" is shown for fresh and chilled food only. For long-life
 * cupboard food the app's opened figure (4–5 days) is far too short —
 * opened rice or honey keeps for months — so the page points to the
 * label rather than publish a number that's wrong.
 */
const showOpened = (f) =>
  !NO_OPENED.has(f.key) && (f.category !== 'pantry' || CHILLED.has(f.key));

/**
 * Fresh foods whose opened figure is the app's dairy default (4 days),
 * which badly undersells them: butter and hard cheese keep for weeks
 * once opened, and "opened" doesn't mean much for eggs.
 */
const NO_OPENED = new Set(['eggs', 'butter', 'cheddar block', 'parmesan']);

/** Foods that change texture badly when frozen: no freezer time shown. */
const NO_FREEZE = new Set([
  'lettuce', 'romaine', 'arugula', 'cucumber', 'celery', 'radish', 'watermelon',
  'cantaloupe', 'potato', 'sweet potato', 'avocado', 'eggs', 'yogurt',
  'greek yogurt', 'sour cream', 'cream cheese', 'cottage cheese', 'tomato',
  'cherry tomatoes', 'guacamole', 'salsa (fresh)', 'mayonnaise',
]);

/** Cupboard foods worth freezing; other cupboard staples don't need it. */
const FREEZE_FROM_CUPBOARD = new Set(['bread', 'bagels', 'tortillas', 'banana', 'mango', 'pineapple', 'peach', 'plum']);

const showFreezer = (f) =>
  !NO_FREEZE.has(f.key) && (f.location !== 'pantry' || FREEZE_FROM_CUPBOARD.has(f.key));

/** Extra lines for a few foods, kept short and factual. */
const NOTES = {
  rice: 'This is uncooked rice. Cooked rice is different: cool it quickly, keep it in the fridge and eat it within a day.',
  pasta: 'This is dried pasta. Fresh pasta from the chiller cabinet keeps for days, not years, so check its packet.',
  eggs: 'UK supermarkets often sell eggs unchilled, but keeping them in the fridge helps them last.',
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

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** "Courgettes" -> plural, "Hummus" -> not. Decides "does" or "do". */
function isPlural(name) {
  const last = name.toLowerCase().split(' ').pop();
  if (['hummus', 'asparagus', 'couscous', 'oats'].includes(last)) return last === 'oats';
  return last.endsWith('s') && !last.endsWith('ss');
}

export function buildFoodList(table, app) {
  const foods = [];
  for (const [category, items] of Object.entries(table)) {
    for (const [key, days] of Object.entries(items)) {
      if (SKIP.has(key)) continue;
      const display = NAMES[key] ?? { name: key.charAt(0).toUpperCase() + key.slice(1) };
      const location = CHILLED.has(key) ? 'fridge' : app.locationFor({ name: key, category });
      foods.push({
        key,
        category,
        days,
        location,
        name: display.name,
        aka: display.aka ?? null,
        slug: slugify(display.name),
        opened: app.openedDaysFor({ name: key, category }),
        frozen: app.freezerDaysFor(category),
        thawed: app.THAWED_DAYS,
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

function foodPage(f, foods) {
  const verb = isPlural(f.name) ? 'do' : 'does';
  const lname = lowerFirst(f.name);
  const title = `How long ${verb} ${lname} last?`;
  const where = WHERE[f.location];
  const keeps = duration(f.days);
  const opened = f.category === 'produce' ? 'Once cut' : 'Once opened';

  const rows = [
    [`As bought, in ${where}`, keeps],
    showOpened(f) ? [opened, duration(f.opened)] : null,
    showFreezer(f) && f.location !== 'freezer' ? ['In the freezer', duration(f.frozen)] : null,
    showFreezer(f) ? ['After thawing', `use within ${duration(f.thawed)}`] : null,
  ].filter(Boolean);

  const lines = [];
  lines.push(`${f.name} ${verb === 'do' ? 'keep' : 'keeps'} for ${keeps} in ${where}, counted from when you buy ${verb === 'do' ? 'them' : 'it'}. That's SnapLarder's estimate for ${lname}${f.aka ? ` (${esc(f.aka)})` : ''} in general. If the packet has a date, go by the packet: it's specific to that product.`);
  if (!showOpened(f) && f.category === 'pantry') {
    lines.push('Once opened, follow the storage instructions on the label. Some products need to go in the fridge after opening.');
  }
  if (NO_FREEZE.has(f.key)) {
    lines.push(`${f.name} ${verb === 'do' ? "don't" : "doesn't"} freeze well.`);
  } else if (!showFreezer(f)) {
    lines.push(`There's no need to freeze ${lname}.`);
  }
  if (NOTES[f.key]) lines.push(NOTES[f.key]);
  if (f.category === 'protein' || f.category === 'dairy') {
    lines.push('A use-by date is about safety. Don’t eat food after its use-by date, even if it looks and smells fine.');
  }

  // The eight foods either side of this one, alphabetically, in its category.
  const same = foods.filter((o) => o.category === f.category && o.slug !== f.slug);
  const at = same.findIndex((o) => o.name.localeCompare(f.name) > 0);
  const start = Math.max(0, Math.min(same.length - 8, (at < 0 ? same.length : at) - 4));
  const related = same.slice(start, start + 8);

  const body = `${heading(title)}

  <section class="demo" aria-label="${esc(f.name)} at a glance">
    <p class="demo-item">${esc(f.name)}</p>
${rows.map(([k, v]) => `    <div class="demo-row"><span>${esc(k)}</span><b class="demo-when">${esc(v)}</b></div>`).join('\n')}
    <p class="demo-note">${showOpened(f) ? 'Opening never extends a date: if the packet date comes sooner, go by that. ' : ''}Estimates for quality, not a safety ruling. <a href="../food-safety.html">What the dates mean</a></p>
  </section>

${lines.map((l) => `  <p>${l}</p>`).join('\n')}

  <h2>Let your phone keep track</h2>
  <p>
    SnapLarder works this out for you. Scan the barcode or photograph the
    label, and it dates each item, then moves the date when you open or
    freeze it. You get a reminder before it goes off.
  </p>
  <a class="cta" href="${APP_STORE_URL}">Download on the App Store</a>

  <h2>More ${esc(CATEGORIES.find(([c]) => c === f.category)[1].toLowerCase())}</h2>
  <ul class="food-links">
${related.map((o) => `    <li><a href="${o.slug}.html">${esc(o.name)}</a></li>`).join('\n')}
  </ul>
  <p><a href="./">All foods</a></p>`;

  return page({
    path: `food/${f.slug}.html`,
    title: `${title} — SnapLarder food guide`,
    description: `${f.name} ${verb === 'do' ? 'keep' : 'keeps'} for ${keeps} in ${where}.${showOpened(f) ? ` Once opened: ${duration(f.opened)}.` : ''}${showFreezer(f) && f.location !== 'freezer' ? ` Frozen: ${duration(f.frozen)}.` : ''} Typical times, and when to go by the packet.`,
    body,
  });
}

function indexPage(foods) {
  const sections = CATEGORIES.map(([cat, label]) => {
    const list = foods.filter((f) => f.category === cat);
    return `  <h2 id="${cat}">${esc(label)}</h2>
  <table class="food-table">
    <thead><tr><th scope="col">Food</th><th scope="col">Keeps for</th><th scope="col">Where</th></tr></thead>
    <tbody>
${list.map((f) => `      <tr data-name="${esc((f.name + ' ' + (f.aka ?? '') + ' ' + f.key).toLowerCase())}"><td><a href="${f.slug}.html">${esc(f.name)}</a></td><td>${esc(duration(f.days))}</td><td>${WHERE_SHORT[f.location]}</td></tr>`).join('\n')}
    </tbody>
  </table>`;
  }).join('\n\n');

  const body = `${heading('How long does food last?')}

  <p class="standfirst">Typical times for ${foods.length} everyday foods, in the fridge, the freezer and the cupboard.</p>

  <p class="aside">
    <b>Use-by or best before?</b> A use-by date is about safety: don't eat
    food after it, even if it looks and smells fine. A best-before date is
    about quality: food is usually fine after it, but may not be at its best.
    These times are general estimates. When the packet has a date, go by
    the packet.
  </p>

  <div class="food-filter" hidden>
    <label for="food-filter">Find a food</label>
    <input id="food-filter" type="search" placeholder="e.g. hummus" autocomplete="off">
    <p class="food-none" hidden>Nothing matches. Try another name.</p>
  </div>

${sections}

  <h2>Let your phone keep track</h2>
  <p>
    SnapLarder uses these same figures. Scan your shopping and it dates each
    item, moves the date when you open or freeze it, and reminds you before
    it goes off.
  </p>
  <a class="cta" href="${APP_STORE_URL}">Download on the App Store</a>

  <script>
    // Optional extra: filter the tables as you type. Without script,
    // the full list still shows.
    (function () {
      var box = document.querySelector('.food-filter');
      var input = document.getElementById('food-filter');
      var none = document.querySelector('.food-none');
      box.hidden = false;
      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase();
        var shown = 0;
        document.querySelectorAll('.food-table').forEach(function (t) {
          var any = 0;
          t.querySelectorAll('tbody tr').forEach(function (r) {
            var hit = !q || r.dataset.name.indexOf(q) !== -1;
            r.hidden = !hit;
            if (hit) any++;
          });
          t.hidden = !any;
          t.previousElementSibling.hidden = !any;
          shown += any;
        });
        none.hidden = shown > 0;
      });
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
