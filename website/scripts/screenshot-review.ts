/**
 * Builds a single local HTML page for reviewing screenshot comparisons.
 *
 * A failing comparison in e2e/utilities/screenshot.ts writes the capture to e2e/screenshots/actual/
 * and a highlighted diff to e2e/screenshots/diff/, beside the committed baseline. Reading three
 * full-page PNGs side by side in a file browser is slow, so this lays every changed capture out as
 * baseline, actual and diff columns with an onion-skin slider to slide one over the other.
 *
 * Run after `npm run test:e2e`, then open the printed path in a browser:
 *
 *   node scripts/screenshot-review.ts
 *
 * Nothing is served and nothing leaves the machine; the page references the PNGs by relative path.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCREENSHOTS_DIR = fileURLToPath(new URL('../e2e/screenshots/', import.meta.url))
const OUTPUT_PATH = path.join(SCREENSHOTS_DIR, 'review.html')

type Comparison = {
  name: string
  baseline: string | undefined
  actual: string | undefined
  diff: string | undefined
}

const pngsIn = (dir: string): string[] => {
  const full = path.join(SCREENSHOTS_DIR, dir)
  if (!fs.existsSync(full)) {
    return []
  }
  return fs
    .readdirSync(full)
    .filter((file) => file.endsWith('.png'))
    .toSorted()
}

const mtime = (dir: string, file: string): number | undefined => {
  const full = path.join(SCREENSHOTS_DIR, dir, file)
  return fs.existsSync(full) ? fs.statSync(full).mtimeMs : undefined
}

// A capture older than its baseline predates the last re-record, so it is evidence of a change that
// has already been accepted, not of a new one. Listing it would send a reviewer after a ghost.
const isStale = (file: string): boolean => {
  const actual = mtime('actual', file)
  const baseline = mtime('baseline', file)
  return actual !== undefined && baseline !== undefined && actual < baseline
}

const comparisons = (): Comparison[] => {
  const names = new Set<string>([...pngsIn('baseline'), ...pngsIn('actual'), ...pngsIn('diff')])
  const has = (dir: string, file: string): string | undefined =>
    fs.existsSync(path.join(SCREENSHOTS_DIR, dir, file)) ? `${dir}/${file}` : undefined
  return [...names].toSorted().map((file) => ({
    name: file.replace(/\.png$/, ''),
    baseline: has('baseline', file),
    actual: isStale(file) ? undefined : has('actual', file),
    diff: isStale(file) ? undefined : has('diff', file)
  }))
}

const escapeHtml = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const image = (src: string | undefined, label: string): string =>
  src
    ? `<figure><figcaption>${label}</figcaption><img src="${escapeHtml(src)}" alt="${escapeHtml(label)}" loading="lazy"></figure>`
    : `<figure><figcaption>${label}</figcaption><p class="missing">none</p></figure>`

const onionSkin = (comparison: Comparison): string => {
  if (!comparison.baseline || !comparison.actual) {
    return ''
  }
  return `
    <details>
      <summary>Overlay: slide baseline over actual</summary>
      <label>Actual opacity <input type="range" min="0" max="100" value="50" oninput="this.closest('details').querySelector('.over').style.opacity = this.value / 100"></label>
      <div class="onion">
        <img src="${escapeHtml(comparison.baseline)}" alt="baseline" loading="lazy">
        <img class="over" src="${escapeHtml(comparison.actual)}" alt="actual" loading="lazy">
      </div>
    </details>`
}

const section = (comparison: Comparison): string => {
  const changed = comparison.actual !== undefined
  return `
  <section class="${changed ? 'changed' : 'unchanged'}" id="${escapeHtml(comparison.name)}">
    <h2>${escapeHtml(comparison.name)} <small>${changed ? 'differs from baseline' : 'no difference recorded'}</small></h2>
    ${
      changed
        ? `<div class="columns">${image(comparison.baseline, 'Baseline (before)')}${image(comparison.actual, 'Actual (after)')}${image(comparison.diff, 'Diff')}</div>${onionSkin(comparison)}`
        : ''
    }
  </section>`
}

const page = (all: Comparison[]): string => {
  const changed = all.filter((comparison) => comparison.actual !== undefined)
  const nav = changed
    .map((comparison) => `<li><a href="#${escapeHtml(comparison.name)}">${escapeHtml(comparison.name)}</a></li>`)
    .join('')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Screenshot review</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 1.5rem; color: #222; background: #fafafa; }
  h1 small, h2 small { font-weight: normal; color: #666; margin-left: .5em; }
  nav ul { columns: 3; padding-left: 1.2em; }
  section { margin: 2rem 0; padding-top: 1rem; border-top: 1px solid #ddd; }
  section.unchanged h2 { color: #888; font-size: 1em; margin: .2em 0; }
  section.unchanged { margin: 0; padding-top: .3rem; border-top: none; }
  .columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; align-items: start; }
  figure { margin: 0; }
  figcaption { font-weight: 600; margin-bottom: .4rem; }
  img { max-width: 100%; border: 1px solid #ccc; background: #fff; }
  .missing { color: #999; }
  details { margin-top: 1rem; }
  .onion { position: relative; max-width: 1280px; }
  .onion img { display: block; width: 100%; }
  .onion .over { position: absolute; inset: 0; opacity: .5; }
  label { display: inline-block; margin: .5rem 0; }
</style>
</head>
<body>
<h1>Screenshot review <small>${changed.length} changed, ${all.length - changed.length} unchanged</small></h1>
<p>Generated by <code>scripts/screenshot-review.ts</code> from <code>e2e/screenshots/</code>. A capture appears
here as changed only if the last e2e run wrote an <code>actual/</code> image for it, which happens when the
comparison failed. Re-record with <code>npm run test:e2e:update-screenshots</code> once the changes
are accepted.</p>
${changed.length ? `<nav><ul>${nav}</ul></nav>` : '<p>No changed captures. Run the e2e project first.</p>'}
${all.map(section).join('\n')}
</body>
</html>
`
}

const all = comparisons()
fs.writeFileSync(OUTPUT_PATH, page(all))
console.log(`${OUTPUT_PATH}\n${all.filter((c) => c.actual).length} changed, ${all.length} total`)
