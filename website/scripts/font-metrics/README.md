# Font metrics generation

`generate-font-metrics.ts` measures per-character advance widths for the fonts RFC content renders
in, and commits them to
[`precomputer/src/utilities/font-metrics.json`](../../../precomputer/src/utilities/font-metrics.json).

```sh
node scripts/font-metrics/generate-font-metrics.ts --origin=http://localhost:3000
```

## Why this exists

The precomputer has to answer width questions — is this citation short enough to keep on one line,
would this word fit unbroken — and it cannot measure text. It runs in Node, with no browser and no
access to the fonts a reader sees.

**Character count is not a usable substitute.** Over 420 citations, a 16-character cap keeps 18 whole
that overflow a narrow column, and every error is in the unsafe direction, because reference labels
are uppercase acronyms and capitals are wide. `[QUIC-RECOVERY]` is 15 characters and 9.0em.
Summing measured advances instead disagrees with a real measurement on 1% of citations, and only ever
by being over-cautious.

## What it measures

One table per text style — body, bold, monospace — each taken from a real element on a real page, so
the font stack resolves exactly as it does for a reader. Advances are recorded in **em**, so they
hold at any font size and can be compared against container widths expressed the same way. The
character set is the union of printable ASCII and every character the sampled documents actually use.

Italic has no table of its own: measured, its advances came out identical to bold, because the face's
obliquing does not change advance widths. Italic and bold-italic use the bold table, which
over-estimates slightly for regular italic — the safe direction, and one fewer table to keep in sync.

## What it cannot know

Summing advances ignores kerning and ligatures. Both only ever _narrow_ text, so a sum runs slightly
wide, which is the safe direction when the answer decides whether something may be left unbroken.
Measured error against whole-string measurement is −1.9% to +4.2%.

It also cannot know that a reader's browser substituted a different face, so consumers still need a
safety margin.

## Keeping it honest

Regenerate when the font stack changes. [`../../e2e/font-metrics.e2e.ts`](../../e2e/font-metrics.e2e.ts)
fails if the committed table drifts from what a browser measures, and also asserts which font is
actually rendering — so a silently substituted face shows up as a test failure rather than as
mis-sized text.
