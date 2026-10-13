# Website tools

Folders starting with `_` aren't published on snaplarder.com by GitHub
Pages. They're still visible in the repository on GitHub, so keep nothing
secret here.

## Rebuild the site

From the website folder:

    node _tools/build.mjs ..\Mobile\fresh-expo

(Use the path to your app folder. Plain Node 20+, nothing to install.)

Every page is generated, so the navigation bar is identical everywhere:

| Page | Edit this |
|---|---|
| index.html, support.html, 404.html | `_tools/pages/` (plain HTML; the first line holds the title and description) |
| privacy.html, terms.html, food-safety.html | the app's `src/services/legal.js` |
| food/ (index and one page per food) | the app's `assets/expiryData.json` and its location, opened and freezer rules |
| navigation bar, footer, head tags | `_tools/page.mjs` |
| sitemap.xml, robots.txt | nothing: built from the list of pages |

Run the build after any change, then commit and push. Don't edit the
generated .html files in the site's root or `food/` by hand: the next
build overwrites them.

## Where the food guide says less than the app

`_tools/build-food.mjs` lists these with reasons. It shows the app's own
figures, but it:

- leaves out "once opened" where opening doesn't shorten the time (eggs);
- leaves out freezer times for foods that don't freeze well, and for
  cupboard food that doesn't need freezing;
- skips half and half and the two "(opened)" entries.

## Styles and images
- All pages use `site.css` (it replaced `style.css`, which can be deleted).
- `img/kitchen.webp` and `img/review.webp` on the home page are frames from
  a real screen recording of the app, with the status bar cropped off.
