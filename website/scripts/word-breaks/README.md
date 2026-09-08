# Word-break measurement scripts

These scripts answer one question: **where should `<wbr>` go, and how many are needed?**

The precomputer inserts `<wbr>` elements into RFC HTML so long identifiers and URLs can wrap on
narrow screens. Every rule it applies has a cost — markup a reader never needed, and a line that may
break where an author did not intend — so the rules are chosen from measurement rather than
intuition. These scripts produce that measurement.

Findings live in [docs/mobile-layout/report.md](../../../docs/mobile-layout/report.md); generated tables
are written to `docs/mobile-layout/data/`. The reason the work exists is
[ietf-tools/red#498](https://github.com/ietf-tools/red/issues/498).

## The scripts

| Script                         | Question it answers                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `wbr-measure.ts`               | For each inserted break, is it doing anything? Removes breaks from the DOM and measures what then overflows.                                |
| `wbr-report.ts`                | Turns `wbr-measure.ts` output into the report's tables. Reads the JSON the measure pass writes; runs no browser.                            |
| `wbr-split-length.ts`          | Which trigger length and run length to use. Simulates candidate pairs against real documents and reports overflow and break count for each. |
| `wbr-trigger-candidates.ts`    | Which _rule_ should trigger a break — underscore, dotted name, camelCase — and how many words each would newly affect.                      |
| `wbr-suppression-prototype.ts` | Could breaks be switched off responsively, once a word is known to fit? Measures the suppression rate a width bucket would achieve.         |

## Running them

All of them share document selection from [`../rfc-samples.ts`](../rfc-samples.ts), so a structure
that once caused a bug keeps being checked:

```sh
node scripts/word-breaks/wbr-split-length.ts                        # curated complex-layout set
node scripts/word-breaks/wbr-split-length.ts --from=8650            # broad sample, xml2rfc era onward
node scripts/word-breaks/wbr-split-length.ts --rfcs=9000,9110       # specific documents
```

Add `--origin=http://localhost:3000` to measure a dev server. **Prefer this.** Prod lags behind both
the current CSS and the current break rules, and either can change which candidate wins.

## The trap to know about

`wbr-split-length.ts` reimplements the precomputer's chunker inside the page, because measuring a
candidate otherwise means republishing the corpus per candidate. That copy has to track
[`precomputer/src/utilities/string.ts`](../../../precomputer/src/utilities/string.ts) exactly.

When it has drifted, the output has not been slightly off — it has been wrong. Two published figures
had to be withdrawn for this: a trigger of 14 was credited with taking overflow from 161 tokens to 5,
then to 106, when the true figure was 198 to 116. Both runs predated the prose guard reaching the
simulation, so the trigger was credited with preventing subdivision the guard already prevented.

A measurement here is only as good as that copy. If you change the chunker, change both, and treat
any result produced before you did as void.
