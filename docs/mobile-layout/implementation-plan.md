# Mobile layout: implementation plan

Internal working plan for the code changes the [report](./report.md) recommends. Written for us,
not for the issue thread.

Items are named rather than numbered, and grouped by what it costs to ship them. Statuses:
**done**, **ready** (no blockers), **blocked**, **open** (needs investigation before it can be
planned), **closed** (decided against).

## Index

| Item | Status | Cost to ship |
| --- | --- | --- |
| [reference-indent](#reference-indent) | done | website |
| [list-indent](#list-indent) | done | website |
| [definition-list-indent](#definition-list-indent) | done | website |
| [title-and-code-wrap](#title-and-code-wrap) | done | website |
| [wide-screen-check](#wide-screen-check) | done | verification only |
| [text-scale-gap](#text-scale-gap) | closed | — |
| [word-boundary-gate](#word-boundary-gate) | done, pending republish | republish |
| [split-length-constants](#split-length-constants) | done, pending republish | republish |
| [prose-chunking](#prose-chunking) | done, pending republish | republish |
| [dotted-name-trigger](#dotted-name-trigger) | done, pending republish | republish |
| [dd-indent-class](#dd-indent-class) | done, pending republish | republish + website |
| [font-metrics](#font-metrics) | done | tooling |
| [citation-nowrap](#citation-nowrap) | done, pending republish | republish + website |
| [separator-placement](#separator-placement) | done, pending republish | republish |
| [lower-break-trigger](#lower-break-trigger) | done, pending republish | republish |
| [break-kind-marking](#break-kind-marking) | parked | republish |
| [width-conditional-identifiers](#width-conditional-identifiers) | done, pending republish | republish |
| [raise-break-trigger](#raise-break-trigger) | closed | — |
| [responsive-tables](#responsive-tables) | closed | — |
| [overflow-attribution-tooling](#overflow-attribution-tooling) | done | tooling |
| [residual-enlarged-overflow](#residual-enlarged-overflow) | parked | investigation |
| [other-engines](#other-engines) | closed | — |
| [flag-lifecycle](#flag-lifecycle) | done | website |
| [word-metadata](#word-metadata) | done, pending republish | republish + website |

## Where things stand

Landed (website-only, no published document changed):

- **Reference indentation fix — released, not behind a flag.** `.references dt`/`dd` in
  `app/assets/css/xml2rfc.css` drop the hanging indent below 60em, stated as nested media queries
  inside the rules themselves. The duplicate `.references dd { overflow: visible }` rule that used
  to sit ~480 lines away is folded in and deleted.
- **List indentation reduced on narrow screens.** `ol, ul` use a mobile-first `margin-left: 1em`,
  widening to `2em` from `min-width: 40em` — em rather than px so the breakpoint tracks the reader's
  text size, matching the reference indent. Verified via CDP `Page.setFontSizes`: a reader with a
  32px browser default keeps the narrow indent to 1400px, where previously they got the wide indent
  from 640px.
- Measurement scripts, grouped under `website/scripts/` with a README per group:
  - `word-breaks/` — `wbr-measure.ts` + `wbr-report.ts` (per-token necessity),
    `wbr-split-length.ts` (candidate split lengths), `wbr-trigger-candidates.ts` (candidate
    trigger rules), `wbr-suppression-prototype.ts` (responsive suppression rate).
  - `layout/` — `mobile-audit.ts` (narrow-screen audit), `wide-screen-check.ts` (prod/dev
    comparison above the threshold).
  - `font-metrics/` — `generate-font-metrics.ts` (per-character advance widths).
  - `rfc-samples.ts` + `rfc-samples.json` stay at the `scripts/` root, shared by all three.
- `website/e2e/word-breaks.e2e.ts`, covering both sides of the 60em threshold and the three modes.

Threshold is 60em for the reference indent. 40em was considered and rejected there: it would leave
the 640-960px band on the old behaviour, and we have no measurements for that band, so 60em is the
choice that doesn't rest on an assumption. Revisit if the targeted sweep shows that band is clean.

Nothing in the precomputer has changed, so no republish has happened yet.

## Ground rules

1. **`app/assets/css/xml2rfc.css` can be edited directly.** It is a hard fork of
   [xml2rfc.css](https://github.com/ietf-tools/xml2rfc/blob/main/xml2rfc/data/xml2rfc.css) that has
   already diverged, with no syncing process in either direction, so the rules can be changed in
   place rather than overridden from elsewhere. Editing them at source is preferable to layering an
   override on top, since the override has to win on specificity and leaves two rules to reason
   about. (The file was called `upstream-xml2rfc.css` and its header implied it was vendored - both
   renamed and reworded, since that reading is what produced a now-deleted "never edit" rule.)
2. **Website changes ship independently of precomputer changes.** Anything touching the precomputer
   costs a full corpus republish, so batch those.
3. Anything that changes the published corpus needs the measurement scripts re-run afterwards to
   confirm the predicted effect, not just assumed.
4. **Nothing may depend on engine break behaviour.** Choosing our own break points is why `<wbr>`
   was adopted; #498 notes Safari handles automatic breaking poorly, and we cannot test WebKit here.

---

# Website fixes - ship independently

## reference-indent

**Status: done.** Released as default behaviour, not a flag. See "Where things stand". The
`narrowReferenceIndent` flag and its paired constant are gone, and the e2e assertions now pin both
sides of the threshold.

## list-indent

**Status: done.** `ol, ul` mobile-first `1em`, widening to `2em` from `min-width: 40em`. Nested
lists add a further `1em` (`ol ol`, `ul ul`, ...), which is untouched and may deserve the same
treatment if [residual-enlarged-overflow](#residual-enlarged-overflow) points back at it.

Worth 66px across the audit sample on its own. Note RFC 8446 got *worse* under this change alone
(24px to 32px): changing one indent reflows content and can expose a different limit, which is why
combinations need measuring rather than each fix in isolation.

## definition-list-indent

**Status: done** — and taken further than this item proposed: rather than merely stacking the term,
the term and definition now flow as one wrapping line below 60em. RFC 9110's index went from 23
items past a 320px viewport at 200% text to none. The original reasoning follows.

The largest remaining measured cause: 193px across the sample, RFC 8975 going
166px to 15px.

`dl > dt { float: left }` applies to *every* definition list, not just `.references`, so Appendix D
of RFC 9110 floats `Proxy-Authentication-Info` in a 224px term box and reaches 112px past a 320px
screen. Extend the narrow-screen rules already in place for `.references dt`/`dd` to `dl > dt`/`dd`
- same treatment, wider selector.

Contexts and their usable width at 320px, for reference:

| Container | Median usable width @320px | Narrowest |
| --- | --- | --- |
| `<th>` | 116px | 39px |
| `<dd>` | 168px | 96px |
| `<dt>` | 193px | 40px |
| `<td>` | 196px | 34px |
| `<li>` | 264px | 108px |

Definition lists outside references (`dlParallel`, `dl.compact`) use a 24px margin and are far less
severe. Tables are [responsive-tables](#responsive-tables) and out of scope here.

## title-and-code-wrap

**Status: title done, inline `code` outstanding.**

The document title heading now carries the existing `wrap-anywhere` utility in
`RFCDocumentBody.vue`. Measured at 320px / 200% text: RFC 9325 **238px → 50px**, RFC 8750
**110px → 0px**; 63% of the remaining page overflow across the four documents tested.

Two things this corrected, worth keeping:

- **The title heading is rendered outside `.rfc-content`**, so the `.rfc-content h1` selector this
  item originally proposed removed **0px**. A scoped selector silently does nothing there.
- An unscoped `h1` selector in `xml2rfc.css` would have worked but breaks the boundary: that file
  styles the RFC body only, and our own chrome uses Tailwind at the element. Hence `wrap-anywhere`
  on the `Heading`.

An earlier measurement credited title wrapping with 156px, taken against prod. It was never
reproducible on this codebase and should be disregarded; the numbers above replace it.

**Inline `code` will not be wrapped.** Wrapping code misrepresents it in a technical document, and
code blocks already sit in horizontally scrollable containers, as tables do. The 95px measured on
RFC 9525 is not worth buying that way. This item is complete with the title change alone.

## wide-screen-check

**Status: done.** Checked by `website/scripts/layout/wide-screen-check.ts`, which compares prod against the
dev server at 1024px and 1280px across the complex-layout set. Prod serves the previous CSS and dev
the new one, while both read the same published documents — neither carries `dd-ml` or
`reference-citation` yet — so any difference at a wide viewport is caused by the CSS rather than by content.

Screenshot baselines were considered and rejected for this purpose. A baseline recorded now encodes
today's CSS as correct: it guards against future drift, but it cannot answer whether today's change
was safe, which is what this item asked.

**Wide layout is now pixel-identical above 60em: 40 of 40 comparisons identical**, across 20
documents at both widths. Nothing overflows at either width in any of them, and no `dd` changed its
own margin.

That took three runs, which is the argument for having the check at all. The first found 12 documents
differing, the second 2, and only the third none — each round exposed an unscoped rule that the
narrow-screen work had applied at every width. Had this shipped on the assumption in the paragraph
below, every reader would have seen list indentation change with no benefit to them.

12 documents do differ, all in the same direction — content is 24-56px **wider** — and the cause is
the list-indent change rather than the definition-list work: `ul.compact` computes a 8px left margin
against prod's 32px (26 such lists in RFC 9110), and one `ul.normal` now computes 0. Those rules sit
outside any media query, so they apply at every width, and the nested lists in RFC 9110 Appendix D
compound the reduction across levels, which is where 56px comes from.

**Resolved by scoping those rules.** The reduction was made for a 320px problem and solved nothing
above the threshold, while costing legibility where there was room: a nested compact list indented
8px instead of 48px, putting its markers almost flush with the parent item's text. The base rule is
back to `2em` with the reduction moved into `@media (max-width: 60em)`, matching the definition-list
rules rather than adding a second breakpoint. Being in em, it also catches a reader at enlarged text
on a wide screen, who has a narrow reader's problem.

Verified on RFC 9110 either side of the threshold — wide layout matches prod again, and the narrow
benefit is untouched:

| Viewport | prod | after |
| --- | --- | --- |
| 1024px | 32px | 32px |
| 1280px | 32px | 32px |
| 320px | 32px | 8px |
| 320px at 200% text | 64px, 223px page overflow | 16px, 47px |

The marker-less lists — `ulBare`, `ul.empty`, `.ulEmpty` — carry a second unscoped rule of their
own and needed the same treatment. They were first left at 0 everywhere on the reasoning that a list
with no markers needs no room for one. That reasoning was wrong about what the indent is doing:
RFC 9110 nests two `ulEmpty` levels around its index, so the indent carries hierarchy and content
width rather than marker space, and zeroing it moved every descendant 64px left at all widths. The
re-run caught it — RFC 9110 and RFC 9330 still differed by 32px per level after the compact-list fix
— and the rule is now scoped to the same breakpoint.

Re-run the script after the republish, when `dd-ml` starts arriving on real documents and the
prod/dev content equivalence this check depends on ends.

## text-scale-gap

**Status: closed — there is nothing to fix.**

The in-page text control is not meant to change font size. It exists to satisfy
[WCAG 1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), which is
a requirement about spacing, and its default setting already meets that requirement in full. Values
above the default are a comfort range beyond anything required.

No defect was ever demonstrated. Page overflow is 0px from 1000px to 1600px at the maximum setting,
and two attempts to find a numeric symptom produced artifacts: an elements-past-the-column counter
that reports the same 929 elements at default settings, which is a pre-existing ~8px content-column
overflow unrelated to word breaks, and a float-collision test that is
invalid because a floated `dt` is out of flow, so the following `dd`'s box starts at the container
edge and only its line boxes are displaced.

The case for work here was built on arithmetic — letter-spacing of 0.5em times a sixteen-character
identifier — and measurement did not support it. The gap in the "scales with text size" claim is
real and is recorded in the report's Limitations; it is not a bug, and no fix is planned. Keep the
CSS-only constraint in mind if this is ever revisited: resizing must not run JS.

### Original notes

**Status: was open.** Em-based media queries resolve against the *browser's* default font size, so they
respond to browser zoom and browser font settings but **not** to our own in-page text scale
(`hasTextScale`), which alters leading/tracking/spacing and not root font size. A reader using our
slider therefore gets neither the reduced reference indent nor the reduced list indent.

**Resizing must stay CSS-only.** No viewport watcher, no JS recomputing layout on resize: that is a
deliberate constraint, since running as little script as possible during a resize is a better
experience. So any fix keys off a media query plus, at most, a class reflecting a stored preference —
never a measured window size.

That leaves two shapes:

1. **Custom properties for the indents**, defined on the RFC content root (not `:root` — the
   stylesheet is `@nested-import`ed inside `.rfc-content`, so a `:root` rule there cannot reach the
   content). The media query and a preference class both select narrow values. No rule bodies are
   duplicated. It cannot express the `display: inline` term/definition switch, which is not a
   property value.
2. **Generate the duplicate block.** Keep the narrow rules once between sentinel comments, emit a
   partial re-wrapping them under the preference class, and add a test asserting the generated file
   is current so drift fails - the pattern `font-metrics.json` already uses. Complete, at the cost
   of a build step.

Which is needed depends on whether the floated term/definition layout actually misbehaves at high
spacing, which is a visual judgement rather than a measurement: page overflow is 0px from 1000px to
1600px at the maximum setting, and two attempts to find a numeric symptom produced artifacts — an
element-past-column counter that reports 929 at default settings, and a float-collision test that is
invalid because a floated `dt` is out of flow, so the following `dd`'s box starts at the container
edge and only its line boxes are displaced.

The report documents the gap under Limitations, pointing at WCAG 1.4.12.

---

# Precomputer corrections - one republish

These four are corrections rather than tuning, and they all edit the same function. Land them
together.

## word-boundary-gate

**Status: ready.** `ensureWordBreaks()` splits text into "words" that carry the preceding whitespace
character, so `length > 16` behaves as 16 visible characters mid-sentence and 17 at the start of an
element - the same word breaks differently depending on where it sits.

Fix by measuring the word without its leading separator.

- Must not disturb break *placement* (the after-underscore rule from #424).
- Unit tests: 15/16/17 visible characters, each as first word and mid-sentence.
- Removes ~20% of all insertions, none of which are load-bearing at default text size.
- Also fixes visible failures, not just waste: `mail.isp.example` and 16-character DOIs
  (`10.17487/RFC2119`) currently get no breaks at all because of this.
- Re-run the measurement scripts afterwards to confirm the drop and that no new overflow appears.

## split-length-constants

**Status: ready.** `REQUIRE_WORDBREAK_AFTER_CHARS_LENGTH` is simultaneously the trigger gate, the
camelCase minimum, *and* the chunk size passed to `chunkString()`. Three independent decisions that
cannot presently be tuned apart. Split them; everything below depends on it.

## prose-chunking

**Status: ready.** `chunkStringAtLengths()` sub-divides every N characters regardless of content,
producing `confidentiality|,`, `interoperabilit|y` and `acknowledgement|s|.` - the
orphaned-character fault our own comments cite as the reason for rejecting `overflow-wrap`,
reproduced in body text.

Options: only hard-chunk runs with no separator to break at (URLs, numeric literals); require a
minimum trailing run so a break can't leave 1-2 characters; or don't hard-chunk alphabetic prose at
all. Whichever we pick, add tests for the three cases above.

## dotted-name-trigger

**Status: ready.** Add "contains an internal dotted name, with a letter in each segment" as a fourth
trigger, so machine-readable words break at their periods regardless of length. Placement rules
unchanged.

Prompted by report Finding 8: `mail.isp.example` is a dotted name with three natural break points
that receives none, while `_imaps.isp.example` beside it wraps cleanly.

### What the rules do about periods today

Periods are a **placement** rule, never a trigger. `chunkString()` breaks *before* any of
`@ \ / : & - = ( ) . ? %`, but nothing reaches `chunkString()` unless the word first passes one of
three triggers: over the length gate, contains `_`, or is a camelCase run at/over the gate. So a
dotted name shorter than the gate keeps its break points and is never told to use them.

### Measured candidates

`website/scripts/word-breaks/wbr-trigger-candidates.ts`, over 8 documents / 16,290 distinct words / 192,837
occurrences. Words are reconstructed across existing `<wbr>` boundaries, without which every
already-broken word is miscounted as fragments.

| Rule | Words triggered | Newly triggered | Prose damaged |
| --- | --- | --- | --- |
| today | 836 | - | - |
| today + internal dotted name (2+ alphanumerics each side) | 1,059 | 223 | 0 |
| **today + internal dotted name, letters required in each segment** | **857** | **21** | **0** |
| today + any url-ish char | 1,533 | 697 | 0\* |
| today + internal url-ish separator (alphanumeric both sides) | 1,100 | 264 | 0\* |
| any period at all (naive) | 3,612 | 2,776 | 1,538 |

\* the classifier counts anything containing `/` as machine-readable, which is wrong here - see
below.

**Recommended: internal dotted name with letters required in both segments.** Twenty-one newly
broken words across eight documents, exactly the intended set: `mail.isp.example`, `isp.example`,
`app.example`, `college.example`, `www.example.com`, `user@isp.example`, `rsalz@akamai.com`,
`p.example.net`, `*.co.uk`. No prose touched.

Requiring a letter in each segment is what keeps section cross-references (`19.15`, `4.2.2`),
decimals and dotted numbers out - they are short, they fit, and breaking them would put a bare
`.15` at the start of a line for no gain. Without that condition the same rule catches 223 words
including all of those.

**Rejected: a url-ish separator trigger.** Reads plausible, but the newly caught words are mostly
prose: `HTTP/3` (201), `HTTP/2` (91), `and/or` (10), `N/A` (16), `request/response` (8). Breaking
`and/or` into `and` + `/or` is exactly the orphaning of [prose-chunking](#prose-chunking). Real URLs
are long and the length gate already catches them.

**Rejected: triggering on any period.** 1,538 prose words, including `connection.`, `packets.`,
`(e.g.,` and author initials `J.`, `M.`, `Ed.` - that last group would put a lone `.` on a line. The
measurement confirms the existing code comment was right.

### Implementation notes

- Do not break before a word-final period: `www.example.com.` must not offer a break before the
  sentence-ending dot.
- Some DOIs (`10.17487/RFC2119`, exactly 16 characters) are missed today for the same reason but
  have numeric segments, so [word-boundary-gate](#word-boundary-gate) catches those, not this rule.

---

# Precomputer tuning - later

## dd-indent-class

**Status: ready.** xml2rfc emits the definition-list hanging indent as an inline style attribute on
each `dd` — `style="margin-left:7.0em"` — computed per list from its longest term. Counts per
document: 13 (RFC 9025), 34 (9297), 43 (9290), 97 (9350), 153 (9000), **493 (9110)**.

An inline style beats every stylesheet rule regardless of specificity, so narrow-screen indentation
rules silently do nothing wherever these appear. This was found only by asking CDP which rules
matched the element — the selector looked correct and the computed value disagreed, which is the
signature of an inline style.

### The change

Emit a class and move the value into a custom property, so the `margin-left` declaration itself
lives in the stylesheet and can be made responsive:

```html
<!-- precomputer output -->
<dd class="dd-ml" style="--dd-ml:7.0em">
```

```css
/* website: honour the indent only where there is room for it */
@media (min-width: 64em) {
  dl > dd.dd-ml { margin-left: var(--dd-ml, 0px) }
}
```

**A class on its own is not enough**, which is the point worth recording: if the inline
`margin-left` stays, it still wins and we are still stuck with `!important`. What makes this work is
that the inline attribute no longer sets `margin-left` at all — it only carries a value the
stylesheet chooses when to use.

### Measured on RFC 9025 with the proposed markup simulated

| Viewport / text size | `--dd-ml` | computed `margin-left` |
| --- | --- | --- |
| 320px / 100% | 7.0em | 0px |
| 320px / 200% | 7.0em | 0px |
| 1200px / 100% | 7.0em | 112px — indent honoured |
| 1200px / 200% | 7.0em | 0px |

The last row is the reason to prefer this over a fixed em value in CSS: 1200px at a 32px browser
default is 37.5em, below the threshold, so an enlarged-text reader on a wide window correctly loses
the indent. The per-list value is preserved exactly, and text-size awareness comes for free.

### Migration

- The website currently zeroes the indent below 64em with `margin-left: 0 !important`, which works
  against today's published markup (RFC 9025: 147px → 85px page overflow, 9 → 0 overflowing
  definitions; RFC 9350: 3 → 0).
- Add the `dd.dd-ml` rule at the same time as the precomputer change; it is inert until documents
  carry the class, so the two can land in either order.
- Remove the `!important` once the corpus is republished, and re-run
  `mobile-audit.ts --origin=...` to confirm nothing regresses.
- Strip only the `margin-left` declaration. Other inline styles in the content (`position`,
  `right`, `transition-duration` on our own popover divs) are ours and must stay.

## separator-placement

**Status: done, pending republish.** A hyphen now ends its chunk, as an underscore does, and a slash
joining two ordinary words is no longer a break point while one inside a machine string still is.
Every snapshot diff across the suite contained only that relocation.

An earlier note here claimed the fixture documents received the same 1,793 breaks before and after.
That figure was read from `src/__snapshots__/rfc-html.test.ts.snap`, a stale duplicate left behind by
a file move; the live snapshot is `src/tasks/__snapshots__/`. It is withdrawn, and the stale
directory is worth deleting so it cannot be misread again.

Two asymmetries in the prose guard surfaced while doing it, both fixed: it stripped leading
separators but not trailing ones, so `manageability-` hard-chunked to `managea|bility`; and it
allowed one internal hyphen but not one internal slash, so `request/response` hard-chunked at the
run length. Placement is tested through `chunkString` rather than `ensureWordBreaks`, so it holds
independently of the trigger — which is the next thing to move.

A third defect turned up in the same area and is fixed with it: the run length counted a trailing
separator, so `connection_` — ten letters carrying an underscore — exceeded a ten-character limit
and subdivided into `connec` + `tion_`. A trailing separator is itself a break opportunity, so it
is no longer counted, and the three-character floor now has one exception for a named segment
following an underscore. `connection_id` therefore breaks as `connection_|id` where it previously
broke mid-word, and `connection_id_length` as `connection_|id_|length`. The exception requires a
letter in the segment: RFC 9000's frame-types table has cells reading `___1`, where the underscores
mark a footnote and `___` + `1` is not a reading of it. That exception is a minimal slice of
[break-kind-marking](#break-kind-marking) — it distinguishes a separator boundary from a break inside
a word using the text alone, where the full item would carry the distinction explicitly.

The original reasoning follows.

Two placement rules put breaks where a line then begins with punctuation:

- **Hyphens break *before* the character**, so `client-initiated` offers `client` + `-initiated` and
  a wrapped line starts with `-`. That is the shape #424 objected to for underscores, and it is
  redundant: browsers already offer a break after a hyphen without being asked. Either break *after*
  the hyphen, as underscores do, or stop offering one at all.
- **Slashes break before the character in prose compounds** — `request` + `/response`, `and` + `/or`.
  A slash inside a machine string should still break; a slash between two ordinary words should not.
  Measured earlier: triggering on a slash alone newly breaks 264 words across 8 documents, almost all
  prose, so the distinction has to be made on what surrounds the separator rather than on the
  separator itself.

Neither was visible at the trigger of 16, because words of 15-16 characters do not qualify. Both
appeared immediately at 14, which is why they gated it.

Add tests for `client-initiated`, `request/response`, `and/or` and `N/A` alongside the existing
placement tests, and re-run `wbr-split-length.ts` afterwards: changing placement changes which runs
are separator-free, which changes what the run length has to subdivide.

## lower-break-trigger

**Status: done, pending republish.** `WORD_BREAK_TRIGGER_LENGTH` and the camelCase minimum that
tracks it are now 14.

Re-measured over 54 documents at 320px after the placement fixes, since changed placement changes
which runs are separator-free:

| Trigger / run | 100% | 150% | 200% | Breaks |
| --- | --- | --- | --- | --- |
| 16 / 10 (was) | 0 | 4 | 197 | 15,668 |
| 14 / 10 (now) | 0 | 4 | **135** | 15,921 |

A 31% reduction in tokens overflowing at 200% text, for 1.6% more break opportunities, and identical
at 100% and 150%. Triggers of 8, 10, 12 and 14 all measure the same — no word in the corpus changes
category between them — so 14 is the top of that plateau and the least intrusive value that reaches
it.

Earlier figures for this item should be disregarded: 161 → 5 predated the prose guard, 161 → 106
predated the guard reaching the simulation, and 182 → 116 predated the placement fixes.

### What it costs in markup, and the follow-up it argues for

Counted on the two fixture documents, lowering the trigger added **94 break opportunities, 92 of
them immediately after a hyphen**:

| | Breaks | After a hyphen |
| --- | --- | --- |
| Trigger 16 | 1,532 | 115 |
| Trigger 14 | 1,626 | 207 |

A break after a hyphen changes no layout, because a browser offers one there unprompted. So almost
everything this change adds is inert markup — the precise thing
[#498](https://github.com/ietf-tools/red/issues/498) objects to — while the overflow win comes from
the other two breaks and from camelCase words newly in scope.

Suppressing those breaks would have reduced this change's cost from 94 breaks to 2, and was the
original argument for [break-kind-marking](#break-kind-marking). It is parked: it depends on every
engine breaking at a hyphen, which ground rule 4 forbids relying on. The engine-independent route to
fewer insertions is [raise-break-trigger](#raise-break-trigger), once tables stop forcing the run
length down.

Two earlier figures should be disregarded: 161 → 5 was measured before the prose guard existed, and
161 → 106 before the guard was mirrored into the simulation. Both credited the trigger with removing
overflow the guard had already protected.

## font-metrics

**Status: done.** The precomputer can now measure text width without a browser.

`website/scripts/font-metrics/generate-font-metrics.ts` measures per-character advance widths in em from real
elements on a real page and commits them to `precomputer/src/utilities/font-metrics.json`;
`font-metrics.ts` sums them via `textWidthEm(text, style)`. Three tables — body, bold, monospace —
with italic deliberately using the bold one, since measured italic advances came out identical and
over-estimating is the safe direction.

### Why character count was not good enough

Over 420 citations, a 16-character cap keeps **18 whole that overflow** a narrow column — and every
error is in the unsafe direction, because reference labels are uppercase acronyms and capitals are
wide: `[QUIC-RECOVERY]` is 15 characters and 9.0em. Summed advances disagree with a live measurement
on 4 of 420, all of them over-cautious.

| Approach | Kept whole | Wrongly kept whole |
| --- | --- | --- |
| True width ≤ 8em | 379 of 420 | — |
| Summed advances ≤ 8em | 375 | **0** |
| Character count ≤ 13 | 349 | 0 |
| Character count ≤ 16 | 397 | 18 |

### What measuring corrected

**The rendered font is Inter, not Arial.** `xml2rfc.css` declares
`--font-sans: Arial, Helvetica, sans-serif` but the theme overrides it. An earlier note in this plan
proposed bundling Liberation Sans for Arial-compatible metrics; that would have measured the wrong
font. Assuming the declared stack was wrong, and only measuring caught it.

### Keeping it honest

- `website/e2e/font-metrics.e2e.ts` measures a sample of characters in a browser and fails if the
  committed table has drifted, and separately asserts the table names the font that is actually
  rendering. Without it a font-stack change invalidates the table silently, and the failure mode is
  citations kept whole that no longer fit.
- Characters missing from the table fall back to the style's mean advance rather than throwing;
  `unmeasuredCharacters()` reports them so the table can be regenerated.
- What it still cannot know: a reader substituting a different face. Consumers keep a safety margin —
  the 8em unconditional citation tier against an 8.5em column, and the 1.2 buffer on every
  `@container` threshold, are that margin.
- Because advances are per-character, letter spacing can be added arithmetically (`n × spacing`),
  which removes part of what blocks [word-metadata](#word-metadata).

## citation-nowrap

**Status: done, pending a republish.** `markReferenceCitations()` in the precomputer marks every
citation span with `reference-citation` and the `wordsize-` class its width falls in. In
`xml2rfc.css` the groupings up to 8em compute to `nowrap` unconditionally; each grouping above has a
`@container` rule at 1.2 times its ceiling, mirroring the word-break rules. Verified on RFC 9000 by
marking the spans the transform would mark: of 89 citations, 70 fall under the 8em grouping and every
one of them stops wrapping; the 19 above it wrap on a 320px screen and hold together once their
paragraph is wide enough. Page overflow was unchanged at both text sizes, so nothing was traded for
it. An earlier version stopped at the 8em cap and left the 19 unmarked at every width.

Keep bracketed citations — `[RFC3629]`, `[OAM-CONS]` — from wrapping mid-name on
narrow screens. The report carries the survey behind this.

### Why a precomputer change rather than CSS alone

xml2rfc already wraps each citation in its own span:

```html
<span>[<a href="#QUIC-INVARIANTS" class="xref">QUIC-INVARIANTS</a>]</span>
```

so `span:has(> a.xref)` would select it today with no republish. Two reasons to prefer a class
anyway: the selector would also catch any other span that happens to contain a single cross-reference
link, and the size cap below is a decision better made once at build time than encoded as a CSS
approximation. A class also survives `:has()` being unavailable.

### The transform

A new utility beside `moveDefinitionIndentToCustomProperty()` in `precomputer/src/tasks/rfc-html.ts`,
run over the POJO in the same pass. Recognise a `span` whose children are exactly:

1. a text node ending `[`,
2. one element — the link,
3. a text node beginning `]`.

and add a class. Surveyed across 6 documents and 338 distinct citations the shape never varies: one
link, never two, and trailing punctuation always outside the span, so `],` needs no special handling
— there is no whitespace between them, so no break opportunity either.

**Hold a citation together only where it fits.** At 200% text `[NIST-SP-800-133r2]` needs 10.2em
against 8.5em of column, so the class alone cannot mean `nowrap`; each citation also carries the
`wordsize-` grouping its width falls in, and the stylesheet decides per container. Citation widths
are median 5.1em, 90th percentile 8.3em, widest 11.7em, so the groupings up to **8em cover 89%** and
need no condition; the rest hold once their container is wide enough.

The width is measured with `textWidthEm()` from [font-metrics](#font-metrics), not counted:
a 16-character cap would wrongly keep 18 of 420 citations whole, since reference labels are uppercase
acronyms and capitals are wide.

### Website side

```css
.reference-citation.wordsize-4,
.reference-citation.wordsize-6,
.reference-citation.wordsize-8 { white-space: nowrap }

@container (min-width: 12em)   { .reference-citation.wordsize-10 { white-space: nowrap } }
@container (min-width: 14.4em) { .reference-citation.wordsize-12 { white-space: nowrap } }
@container (min-width: 19.2em) { .reference-citation.wordsize-16 { white-space: nowrap } }
@container (min-width: 28.8em) { .reference-citation.wordsize-24 { white-space: nowrap } }
```

The first rule needs no condition and still holds where container queries are unsupported. The e2e
test injects a `wordsize-8` and a `wordsize-24` citation into a paragraph and asserts that the first
computes to `nowrap` at 320px, the second does not, and the second does at 1200px.

### Interaction with word breaks

Negligible, and measured: 5 of 338 citations contain an inserted word break, and only `[NIST_PQ]`
(4.8em) is under the cap. It fits in every context measured, so `nowrap` suppressing its break costs
nothing. The other four are above it and keep their breaks in a narrow container. Where the two
mechanisms meet, one width condition decides both — but re-run `wbr-split-length.ts` after this
lands, since a `nowrap` span changes what the surrounding line can do.

## break-kind-marking

**Status: parked, and the reason is worth keeping.** The case for it grew out of a measurement that
207 of 1,626 inserted breaks sit immediately after a hyphen, where Chromium offers a break
unprompted, so suppressing them would remove 12.7% of insertions with no layout change.

That case does not survive ground rule 4 — *nothing may depend on engine break behaviour*. Not
emitting a break at a hyphen depends on every engine offering one there. It was measured in Chromium
alone, and Safari's wrapping is poor enough that the report links to it rather than relying on it.
An engine that does not break at a hyphen would lose the opportunity entirely and break mobile
layout, which is the fault this work exists to remove.

The benefit was also smaller than the percentage suggests: 207 `<wbr>` elements are roughly 1KB
uncompressed. Fewer elements in the published HTML is what
[#498](https://github.com/ietf-tools/red/issues/498) asks for, so it is not *only* a size
optimisation — but it buys nothing in layout, and it is not worth an engine-dependence risk.

[other-engines](#other-engines) is the gate. If a non-Chromium runner ever confirms hyphen breaking
is universal, this and [width-conditional-identifiers](#width-conditional-identifiers) can be
unparked together. Until then, [raise-break-trigger](#raise-break-trigger) is the engine-independent
way to reduce insertions: inserting fewer breaks in the first place needs no assumption about what a
browser would have done.

The original design follows.

### Original design


**Status: ready** (but see [word-metadata](#word-metadata) for what *not* to do). Mark
identifier-origin breaks distinctly from URL-origin ones - `<wbr class="i">` or similar - so CSS can
tell them apart. Prerequisite for [width-conditional-identifiers](#width-conditional-identifiers).

Mark the *smaller* set: identifier-triggered tokens are roughly a quarter of the total, so marking
identifiers rather than URLs is the cheaper direction. Measured cost is ~50 KB uncompressed per
large document (RFC 9000: 1,694 breaks) and no extra DOM nodes. Sanity-check the delta on RFC 9000
before doing the whole corpus.

## width-conditional-identifiers

**Status: done, pending republish** — and it did not need
[break-kind-marking](#break-kind-marking) after all.

The blocker recorded here was that CSS cannot tell an identifier break from a URL break, so a width
threshold would suppress both. Labelling each break with the width its word needs removes the
question: a URL whose container is wide enough for the whole URL needs no break either, so the kind
never has to be known. Width subsumes it.

Each `<wbr>` carries `wordsize-N`, the first em ceiling from `[4, 6, 8, 10, 12, 16, 24]` the word
fits inside, measured with the committed font metrics in the style the word renders in — monospace
inside `code`, bold inside `strong`, `th`, `dt` and headings, since a body-font estimate for
monospace would be too small and would suppress a break that was needed. `xml2rfc.css` makes the
text blocks query containers and hides each word size grouping once the container reaches 1.2× its
ceiling.

Measured at 320px with `wbr-suppression-prototype.ts`, no page or element got wider:

| Document | Text | Breaks suppressed | Page overflow |
| --- | --- | --- | --- |
| RFC 9000 | 100% | 672 (40%) | 0px → 0px |
| RFC 9110 | 100% | 447 (32%) | 0px → 0px |
| RFC 9000 | 200% | 25 (1%) | 37px → 37px |

This is the change that most directly answers #498: at the text size the issue was raised at, most
breaks are inactive; at 200% they are all still there.

**Verification has a silent failure mode.** A check that labels every break in a paragraph with the
first word's width reports large regressions on every document and looks exactly like a real one.
Use the prototype, which reconstructs each word from the fragments around its own breaks.

## raise-break-trigger

**Status: closed — measured and not worth it.** With table tokens correctly exempted, raising the
trigger from 14 to 20 removes 8% of insertions (15,921 → 14,634) and takes tokens that still do not
fit at 200% text from 135 to 726. At 24 it is 945. None of that is inside a scroller.

At default text size every candidate up to 24 is clean, so the reduction is genuinely available —
but only by withdrawing support at enlarged text, which is the condition the breaks exist for. The
old blocker recorded here (tables) was never the real constraint; see report Finding 6.

The original reasoning follows.

### Original reasoning


**Status: blocked on [responsive-tables](#responsive-tables).** At default text a trigger of 24-28
removes 17-20% of all break opportunities, but 15 tokens then overflow and *every one* is in a
`<td>` or `<dt>` 117-230px wide (`Proxy-Authentication-Info`, `ChapterSegmentEditionUID`). Nothing
in prose, identifiers or references fails.

So: fix tables, re-run `wbr-split-length.ts`, then raise the trigger. The other order trades one
overflow for another.

The chunk size can go 16 to 20 today for ~1% fewer breaks with no overflow change. Not worth a
republish on its own; fold it in if we're republishing anyway.

---

# Investigations

## responsive-tables

**Status: closed — not needed.** Tables are already wrapped in horizontally scrollable containers,
so a wide table does not stretch the page; it scrolls, which is the intended behaviour.

This mattered beyond one item. `wbr-split-length.ts` had no scroller exemption, so every token
inside a scrolling table or ABNF block counted as "overflowing" even though it reaches the reader as
a scroller rather than as broken layout. That is the same conflation that produced the retracted
1,077px finding in `mobile-audit.ts`, and it fed the split-length measurements — including the one
that lowered the trigger to 14. The script now reports scroller-internal overflow in a separate
column instead of counting it, and the corpus is being re-measured on that basis; if the exempt
share is large, [raise-break-trigger](#raise-break-trigger) becomes available and the trigger
decision needs revisiting.

The original reasoning follows, kept because it explains what the old numbers were counting.

### Original reasoning


**Status: open, and now a blocker.** `<th>` at 116px median and `<td>` down to 34px are worse than
`<dd>`. Word breaks can't fix a 34px cell, and narrow cells are the only thing preventing the 17-20%
reduction in inserted breaks that [raise-break-trigger](#raise-break-trigger) would deliver.

Needs a responsive table treatment; worth its own issue.

## overflow-attribution-tooling

**Status: done.** `isExempt()` in `mobile-audit.ts` now treats an element as exempt when its own
`overflow-x` clips (`auto`, `scroll`, `hidden` or `clip`), and does not attribute a container's
excess to it when that excess comes from a scrolling descendant. The original problem: The `clipped()`/`isExempt()` helpers in
the measurement scripts walk *ancestors* only, so they correctly ignore content inside a horizontal
scroller but not an element that **is** a scroller or **contains** one. A scroll container having
`scrollWidth > clientWidth` is what scrolling is, not a defect.

This produced a retracted finding: RFC 9110 §5.6.5's ABNF block was reported as overflowing by
1,077px, when it is correctly wrapped in `div.w-full.max-w-screen` and its real excess is 16px.

Fix in `mobile-audit.ts` and the ad-hoc probes:

- treat an element as exempt when *its own* `overflow-x` is `auto`/`scroll`, not just an ancestor's;
- do not attribute a container's excess to it when that excess comes from a descendant scroller.

Two related traps already learned the hard way, worth keeping in one place: an element crossing the
viewport is not necessarily what makes the page wide (pilcrows cross it 179 times and account for
3px), and text overflowing its container moves no element's bounding box at all — only the
container's `scrollWidth`. **Every candidate cause must be confirmed by removing it and
re-measuring**, which is the only check that caught any of these.

## residual-enlarged-overflow

**Status: parked.** 34-47px of horizontal overflow remains at 200% text on a 320px screen. Minor
against where this started, and no reader has reported it. The original notes follow.

### Original notes

**Status: open - narrowed, not solved.** RFC 9000 keeps ~65px at 200% text with every website fix
applied. Ruled out at 0-4px each: references, other definition lists, list indentation, the title,
inline code, pilcrows, aside/blockquote padding.

The widest-path trace bottoms out in a nested `li` in section 1.1 at 176px usable, but widening it
recovers only 4px, so something else is binding. Re-trace with
[definition-list-indent](#definition-list-indent) and [title-and-code-wrap](#title-and-code-wrap)
applied.

Two measurement lessons from this hunt, worth keeping: an element crossing the viewport is not
necessarily what makes the page wide (pilcrows cross it 179 times and account for 3px), and text
overflowing its container moves no element's bounding box at all - only the container's
`scrollWidth`. Both signals are needed, and candidate fixes must be tested by removal.

## other-engines

**Status: closed.** Verifying Firefox and Safari behaviour is not being pursued.

The consequence is worth stating: this was the gate for unparking
[break-kind-marking](#break-kind-marking) and
[width-conditional-identifiers](#width-conditional-identifiers), both of which depend on knowing
what an engine does unaided. With no engine verification planned, they stay parked indefinitely
rather than pending, and ground rule 4 stands as the reason. The original notes follow.

### Original notes

**Status: open, needs a non-Linux runner.** Everything was measured in Chromium. The reporter using
Safari is our nearest signal in the meantime, and ground rule 4 exists because of this gap.

---

# Ongoing and closed

## flag-lifecycle

**Status: done — `wbrMode` retired.**

- `narrowReferenceIndent`: done - released as default and removed.
- `wbrMode`: **removed.** It had no external consumer — an earlier note here assumed the report
  would be shared and that the issue reporter would use the flag, and neither was the case. It was
  investigative scaffolding, the comparison it existed for is complete and recorded in the report,
  and the measurement scripts reproduce any of it by injecting CSS directly. Gone: the flag entry
  and its UI row, `word-breaks.ts`, the three rule blocks in `xml2rfc.css`, and the stale comment
  above them. Nothing was promoted to `AdvancedUISettings`: there was no demand to justify a
  permanent user preference.
- The two e2e tests that asserted the modes were **replaced by one that asserts the point they were
  incidentally proving**: disable the breaks with injected CSS and the page must start overflowing
  (0px → 19px on RFC 9297). A test that only checked the elements exist would pass equally well if
  they had stopped working.
- Keep the measurement scripts permanently - they are the evidence base for the next time this comes
  up, and cheap to re-run.

### Rejected: keeping `overflow-wrap` as a fallback

Measured, `overflow-wrap` removes the residual overflow at 200% text that
[residual-enlarged-overflow](#residual-enlarged-overflow) is parked on, and it needs no assumption
about engine breaking behaviour because it only acts on what does not fit. It is still rejected, for
a reason that outranks the saving: it would silently absorb every case where the inserted breaks are
inadequate, so the breaks could no longer be seen to work or fail. Whether they work is the whole
question, and a fallback that hides the answer removes our ability to measure the thing we maintain.

## word-metadata

**Status: done, pending republish**, in a form the objections below do not apply to. See
[width-conditional-identifiers](#width-conditional-identifiers) for what shipped: no wrapper
element, and measured width in em rather than character length, which is what removed the fatal
objection recorded here. The original proposal and its objections follow, because they explain why
the shipped form takes the shape it does.

The proposal was to emit a wrapper element per broken word carrying its character length, so the
website could enable or disable breaks per word length, responsively, in CSS.

**A wrapper is not needed for that.** Every `<wbr>` belongs to exactly one word, so the word's
length can go on the `<wbr>` itself - `<wbr class="len-24">` - and CSS selects it identically with
no new elements:

```css
@media (min-width: 60em) { .rfc-content wbr.len-16 { display: none } }
```

The wrapper's only unique capability was applying `overflow-wrap: anywhere` to machine-readable
words - handing break points to the browser. Ground rule 4 forbids that, so the wrapper is ruled
out rather than deferred. It was also the more expensive option: ~84 KB and ~900 extra nodes per
document, against ~50 KB and none.

Measured cost of both, per document, uncompressed:

| Document | `<wbr>` | Broken words | Class on each `<wbr>` | Wrapper span per word | Extra DOM nodes |
| --- | --- | --- | --- | --- | --- |
| RFC 9000 | 1,694 | 915 | 49.6 KB | 84.0 KB | 915 |
| RFC 9110 | 1,393 | 592 | 40.8 KB | 54.3 KB | 592 |
| RFC 9297 | 238 | 81 | 7.0 KB | 7.4 KB | 81 |

Objections that apply even to the attribute form, and survive:

- **CSS cannot compare numbers.** There is no `[data-len > 20]`, so per-length policy has to be
  word size groupings (`wordsize-16`, `wordsize-24`, `wordsize-32`) and every boundary is baked into published documents -
  replacing one hardcoded number with a hardcoded set of bands.
- **Any class the precomputer publishes must not collide with a utility class.** Tailwind is loaded
  on these pages, so a grouping named `w-8` would take `width: 2rem` from it. Prefix these classes
  `wordsize-`, and apply the same test to any future class: check it against the utility namespace
  before it ships into documents.
- **Character length is a poor proxy for rendered width**, which is what actually decides overflow.
  Our own data has 16-character tokens ranging 145px-307px depending on context. This is the
  objection that sank the original proposal, and [font-metrics](#font-metrics) answered it: the
  precomputer can measure width, so the label carries em rather than characters.
- Container queries are not a way out: they need a non-inline `container-type`, and making a word
  `inline-block` stops it wrapping across lines.

What survives is the narrower [break-kind-marking](#break-kind-marking): identifier vs URL, which
CSS genuinely cannot infer, and which unblocks
[width-conditional-identifiers](#width-conditional-identifiers).

Do the four precomputer corrections first and re-run the audit before revisiting even that - much of
the appetite for runtime control is appetite for undoing insertions that should not have existed.

---

## Risks

- **Republish cost.** The four corrections are one republish; `break-kind-marking` is another.
  Batch them.
- **Any rule keyed off a class on the content root needs the `&.class` compound form.** Because
  `xml2rfc.css` is `@nested-import`ed under the content element, a bare `.some-class` selector
  compiles to a descendant and silently matches nothing. This bit the retired `wbrMode` rules and
  would bite any future rule keyed off a class on that element.
- **Fixes interact.** RFC 8446 got worse under `list-indent` alone. Measure the combination that
  ships, not each part.
