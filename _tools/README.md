# Website tools

Folders starting with `_` aren't published by GitHub Pages, so this
folder stays private to the repo.

## Rebuild the generated pages

From the website folder:

    node _tools/build.mjs ..\Mobile\fresh-expo

(Use the path to your app folder. Plain Node 20+, nothing to install.)

It regenerates, from the app's own files:

| Page | Comes from |
|---|---|
| privacy.html, terms.html, food-safety.html | `src/services/legal.js` |
| food/ (index and one page per food) | `assets/expiryData.json` plus the app's location, opened and freezer rules |
| sitemap.xml, robots.txt | the list of pages |

Run it whenever you change `legal.js` or `expiryData.json`, then commit
and push. Don't edit the generated pages by hand: the next build
overwrites them.

`index.html`, `support.html` and `404.html` are written by hand.

## Where the food guide says less than the app

`_tools/build-food.mjs` lists these with reasons. In short, the site
never shows a longer time than the app, but it:

- shows hummus, guacamole, pesto and fresh salsa in the fridge (the app
  currently files them in the cupboard);
- leaves out "once opened" for long-life cupboard food, eggs, butter,
  cheddar and parmesan, where the app's default is far too short;
- leaves out freezer times for foods that don't freeze well;
- skips half and half and the two "(opened)" entries.
