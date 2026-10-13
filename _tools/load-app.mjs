/**
 * Loads modules straight from the SnapLarder app, so the website uses
 * the app's own text, numbers and rules rather than copies of them.
 *
 * The app's files are written for the React Native bundler: imports have
 * no ".js" extension and the shelf-life table is imported as JSON. Plain
 * node needs both spelled out, so this copies the files it needs into a
 * temporary folder, fixes those two things, and imports the result.
 * The app's files themselves are never changed.
 *
 * Only plain-logic modules can be loaded this way. If one starts
 * importing something from React Native or Expo, this stops with a clear
 * message instead of half-working.
 */

import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const IMPORT_RE = /(import\s[^;]*?\sfrom\s*|export\s[^;]*?\sfrom\s*)(['"])([^'"]+)\2/g;

export async function loadAppModules(appRoot, modules) {
  const root = path.resolve(appRoot);
  const servicesDir = path.join(root, 'src', 'services');
  if (!existsSync(servicesDir)) {
    throw new Error(
      `Can't find the app at ${root}\n` +
      `Expected a src/services folder there. Pass the path to the app, e.g.\n` +
      `  node _tools/build.mjs ../fresh-expo`
    );
  }

  const tmp = await mkdtemp(path.join(tmpdir(), 'snaplarder-site-'));
  const done = new Set();

  async function copy(absPath) {
    if (done.has(absPath)) return;
    done.add(absPath);
    const out = path.join(tmp, outName(root, absPath));

    if (absPath.endsWith('.json')) {
      const json = await readFile(absPath, 'utf8');
      await writeFile(out, `export default ${json.trim()};\n`, 'utf8');
      return;
    }

    let src = await readFile(absPath, 'utf8');
    const deps = [];
    src = src.replace(IMPORT_RE, (whole, head, q, spec) => {
      if (!spec.startsWith('.')) {
        throw new Error(
          `${path.relative(root, absPath)} imports "${spec}", which only exists inside the app.\n` +
          `The website can only reuse plain-logic files.`
        );
      }
      let dep = path.resolve(path.dirname(absPath), spec);
      if (!dep.endsWith('.json') && !dep.endsWith('.js')) dep += '.js';
      deps.push(dep);
      return `${head}${q}./${outName(root, dep)}${q}`;
    });
    await writeFile(out, src, 'utf8');
    for (const d of deps) await copy(d);
  }

  const result = {};
  for (const name of modules) {
    const abs = path.join(servicesDir, `${name}.js`);
    await copy(abs);
    Object.assign(result, await import(pathToFileURL(path.join(tmp, outName(root, abs))).href));
  }

  await rm(tmp, { recursive: true, force: true });
  return result;
}

/** A flat, unique file name for each source file in the temp folder. */
function outName(root, abs) {
  const rel = path.relative(root, abs).split(path.sep).join('_');
  return rel.replace(/\.(js|json)$/, '') + '.mjs';
}

/** The app's raw shelf-life table: { category: { food: days } }. */
export async function loadShelfLifeTable(appRoot) {
  const file = path.join(path.resolve(appRoot), 'assets', 'expiryData.json');
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
}
