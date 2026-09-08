# Mobile layout in RFC documents

The '/info/rfcN/' work adapts a corpus written for desktop resolutions with poor mobile support.
The root cause is that RFCs were not designed for mobile layout.

Everything here exists to stop RFCs **breaking mobile layout** — content stretching the page
sideways on a narrow screen, or on any screen once the reader enlarges the text, so the document has
to be scrolled horizontally to be read. Word breaks are one means to that end, not the end itself,
and the rest of this report weighs each option by how well it serves that goal.

## Summary

1. **At a 320px width and default text size, most break opportunities go unused.** A `<wbr>` marks
   a place a line _may_ break, and a browser takes it only when the text needs the room; across 120
   documents 72% of them are never taken in those conditions. For the rule #498 objects to — any
   word containing an underscore — it is **99%**. Unused is the intended state, not a fault; what
   matters is what happens when the conditions change —
   [Finding 1](#finding-1-most-insertions-are-inert-at-default-text-size).
2. **At 200% text size the picture reverses.** The same measurement gives 78% of insertions as
   necessary — at that size the layout genuinely depends on them. `PATH_CHALLENGE`, the example
   given in #498, never breaks the layout at default text size, and does so in 42 of its 44
   appearances at 200% — [Finding 2](#finding-2-the-picture-reverses-at-200-text).
3. **What was breaking mobile layout was mostly indentation carried from original RFC rendering, not word length.**
   Reference lists indented each entry by a fixed `8em`. Because that indent scaled with the reader's text size
   while the screen did not, a 320px screen at 200% text left **16px** of usable width for the
   reference text — a width no word-breaking rule can work with —
   [Finding 3](#finding-3-what-breaks-mobile-layout-is-indentation-not-word-length).
4. **Giving the text its width back achieved more than any change to word breaking.** Definition
   lists, asides, lists and the document title have all been changed, and at default text size
   nothing in the sample breaks mobile layout any more — see
   [Changes made](#changes-made).
5. **The rules also had a defect**: the same word broke differently depending on where it
   appeared in a paragraph. That is fixed —
   [Finding 9](#finding-9-where-to-insert-breaks-and-how-the-split-length-was-chosen).
6. The one category that genuinely needs breaking at every size is **URLs** —
   [Finding 5](#finding-5-urls-are-the-category-that-genuinely-needs-breaking).
7. **Breaks now switch off where the word provably fits.** Each `<wbr>` carries a `wordsize-`
   class naming how much room its word needs — `<wbr class="wordsize-8">` for a word up to 8em wide
   — and CSS hides it once the containing block is at least that wide. 40% of RFC 9000's breaks are
   inactive at default text size, and almost none at 200% —
   [Finding 10](#finding-10-breaks-switch-off-where-the-word-provably-fits).

[Changes made](#changes-made) lists what has been done; the remainder are in
[Potential future work](#potential-future-work).

## What we insert, and why

RFC HTML is generated ahead of time. During that step
[`ensureWordBreaks()`](https://github.com/ietf-tools/red/blob/main/precomputer/src/tasks/rfc-html.ts#L290-L409)
walks the document's text and inserts `<wbr>` elements, which mark a place the browser _may_ break
a line if it needs to. They are skipped inside `<pre>` and `<svg>`, so code and artwork is never touched.

A word receives break opportunities if any of these hold, as of 09/2026:

| Rule                  | Condition                                                          |
| --------------------- | ------------------------------------------------------------------ |
| Length gate           | longer than 14 characters                                          |
| Underscore            | contains `_`, at any length                                        |
| camelCase             | contains a lower-to-upper transition and is at least 14 characters |
| Machine-readable name | a dotted name such as `mail.isp.example`, at any length            |

Where the breaks are placed is decided by
[`chunkString()`](https://github.com/ietf-tools/red/blob/main/precomputer/src/utilities/string.ts#L12-L66),
also as of 09/2026: before most separators (`/ : @ . = ? %`), after a run of underscores or hyphens,
and at camelCase humps. A slash joining two ordinary words is not a break point at all. Breaking
_after_ the underscore rather than before it was the outcome of #424, and hyphens now follow the
same rule.

These values are the ones the code holds today rather than settled policy; check
`ensureWordBreaks()` before relying on them.

`<wbr>` was chosen over the alternatives because it is not a character: it does not appear when the
text is copied to the clipboard, unlike a zero-width space, and it does not add a visible hyphen,
unlike `&shy;`. Unlike `overflow-wrap`, it lets us choose _where_ a break may happen.

## The goal: not breaking mobile layout

Everything here exists to stop RFCs **breaking mobile layout** — content stretching the page
sideways on a narrow screen, or on any screen once the reader enlarges the text, so the document has
to be scrolled horizontally to be read. Word breaks are one means to that end, not the end itself,
and the rest of this report weighs each option by how well it serves it.

The requirement is not small phones. It is
[WCAG 2.2 SC 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), which
requires content to be readable without horizontal scrolling at a width equivalent to **320 CSS
pixels** — what a 1280px desktop window becomes at 400% zoom. Alongside it,
[SC 1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) requires text
to remain usable when enlarged to 200%. So "mobile" here covers a phone at default text and a
desktop at large text alike: both give the content the same narrow column.

This is the substance of the disagreement in #498. The observation there — that a 45-character
phrase fits comfortably on a small phone — is correct, and our measurements agree with it. But the
width a phone provides at default text size is not the width the guidelines are measured at. All
measurements below use 320px, at both default and 200% text size.

## How this was measured

A script drives a real browser over published pages on www.rfc-editor.org, and for each document:

1. records horizontal overflow with the word breaks live;
2. suppresses every word break and records overflow again;
3. for every token containing a word break, measures its unbroken width against the width actually
   available in its containing block.

A break opportunity is counted as **load-bearing** when removing it would break mobile layout —
its token cannot fit unbroken in the space available — and **inert** when the token fits either way. Artwork (`<pre>`, `<svg>`) is
hidden during measurement: it never receives word breaks and is deliberately allowed to scroll, so
including it would credit word breaks with fixing something they never touch.

Corpus: 120 documents sampled across RFC 8650–9700, the range published in xml2rfc format. Earlier
RFCs are published as plain text inside `<pre>` and receive no word breaks at all, so they are not
eligible; plain-text documents falling inside the sampled range are excluded too. The sample
covers 90,908 `<wbr>` elements and 13,587 distinct tokens.

Reproduce with:

```
node website/scripts/word-breaks/wbr-measure.ts --corpus=broad
node website/scripts/word-breaks/wbr-report.ts --corpus=broad
```

Raw data is in [`data/`](./data/), and every table below is generated into
[`data/generated-tables-broad.md`](./data/generated-tables-broad.md).

## Finding 1: most insertions are inert at default text size

At a 320px viewport with default text size, of 14,340 measured break opportunities only 28% are
load-bearing.

| Insertion rule                                    | Tokens | Load-bearing | Inert | % inert |
| ------------------------------------------------- | ------ | ------------ | ----- | ------- |
| length gate only                                  | 7021   | 3560         | 3461  | 49%     |
| under the 16-char gate (leading-space off-by-one) | 3153   | 4            | 3149  | 100%    |
| length gate + identifier rule                     | 1803   | 405          | 1398  | 78%     |
| underscore rule only                              | 1456   | 8            | 1448  | 99%     |
| camelCase rule only                               | 154    | 0            | 154   | 100%    |

The complaint in #498 is directed at the underscore rule, and on this evidence it is justified:
1,448 of 1,456 tokens that receive breaks _solely_ because they contain an underscore never come
close to needing one at default text size.

## Finding 2: the picture reverses at 200% text

The same tokens, same 320px width, with text at 200%:

| Insertion rule                                    | Tokens | Load-bearing | Inert | % inert |
| ------------------------------------------------- | ------ | ------------ | ----- | ------- |
| length gate only                                  | 7021   | 6391         | 630   | 9%      |
| under the 16-char gate (leading-space off-by-one) | 3153   | 2422         | 731   | 23%     |
| length gate + identifier rule                     | 1803   | 1453         | 350   | 19%     |
| underscore rule only                              | 1456   | 381          | 1075  | 74%     |
| camelCase rule only                               | 154    | 100          | 54    | 35%     |

Overall, load-bearing insertions rise from 28% to 78%.

`PATH_CHALLENGE` is a precise illustration. In RFC 9000 it appears 44 times. At default text size
it overflows **zero** times — it needs 145–164px and has 196–296px. At 200% text it needs 287px
against 272px available and overflows in **42 of 44** appearances, including
[section 8.2](https://www.rfc-editor.org/info/rfc9000/#section-8.2-6), the section cited in the
issue.

Identifiers that cross the threshold only when text is enlarged:

| Token              | Needs | Has   | Where                                                                  |
| ------------------ | ----- | ----- | ---------------------------------------------------------------------- |
| `SEQUENCE_WINDOW;` | 332px | 208px | [RFC 9685](https://www.rfc-editor.org/info/rfc9685/#section-7.3-4.2.5) |
| `CONNECTION_CLOSE` | 331px | 272px | [RFC 9000](https://www.rfc-editor.org/info/rfc9000/#section-5.2.2-5)   |
| `MAX_ACK_REQUESTS` | 331px | 272px | [RFC 9442](https://www.rfc-editor.org/info/rfc9442/#section-3.5.1.2-3) |
| `H3_CONNECT_ERROR` | 330px | 272px | [RFC 9114](https://www.rfc-editor.org/info/rfc9114/#section-4.4-10)    |
| `"CONTENT_LENGTH"` | 323px | 272px | [RFC 9110](https://www.rfc-editor.org/info/rfc9110/#section-17.10-3)   |
| `AEAD_AES_256_GCM` | 319px | 272px | [RFC 9001](https://www.rfc-editor.org/info/rfc9001/#section-5.4.1-8)   |
| `KEY_UPDATE_ERROR` | 316px | 272px | [RFC 9001](https://www.rfc-editor.org/info/rfc9001/#section-6.7-1)     |
| `STREAMS_BLOCKED`  | 312px | 272px | [RFC 9000](https://www.rfc-editor.org/info/rfc9000/#section-4.6-6)     |

So the underscore rule goes unused in the reading conditions described in #498, and is relied on
in the conditions the accessibility guidelines describe. Any resolution has to hold both facts at
once.

## Finding 3: what breaks mobile layout is indentation, not word length

The question is not "how long is this word" but "how little room does this part of the document
have". Usable width at a 320px viewport, by container:

| Container | Tokens measured | Median usable width | Narrowest |
| --------- | --------------- | ------------------- | --------- |
| `<th>`    | 14              | 116px               | 39px      |
| `<dd>`    | 6017            | 168px               | 96px      |
| `<dt>`    | 486             | 193px               | 40px      |
| `<td>`    | 467             | 196px               | 34px      |
| `<li>`    | 662             | 264px               | 108px     |
| `<p>`     | 5146            | 296px               | 40px      |

A `<dd>` — the body of a reference or definition entry, and the single most common context for
these tokens — has 168px where a paragraph has 296px. The cause was in the imported xml2rfc
stylesheet: the term floats left with `min-width: 7em` and the definition clears it with
`margin-left: 8em`, both fixed em amounts.

```css
/* before */
.references dt {
  text-align: right;
  font-weight: bold;
  min-width: 7em;
}

.references dd {
  margin-left: 8em;
  overflow: auto;
}
```

A second rule some 480 lines further down reset `overflow` to `visible`, with a comment explaining
it was to stop reference text sitting in a block with a very wide left margin — the same problem,
treated at the symptom rather than the cause.

This has since been fixed; see [Changes made](#changes-made). The current rules are at
[`xml2rfc.css#L522-L542`](https://github.com/ietf-tools/red/blob/main/website/app/assets/css/xml2rfc.css#L522-L542).

That indent is expressed in `em`, so it grows with the reader's text size while the screen does
not. Measuring the reference list of RFC 9000 at a 320px viewport:

| Text size | Usable width in a reference entry |
| --------- | --------------------------------- |
| 100%      | 168px                             |
| 150%      | 92px                              |
| 200%      | **16px**                          |

At 200% text, a reference entry has sixteen pixels of usable width — roughly one character. This is
not a word-breaking problem and cannot be solved by word breaking.

Reducing the indent on narrow screens (placing the term above its definition instead of beside it)
recovers most of that width. Measured on RFC 9000 at 320px, page overflow:

| Text size | Current indent | Reduced indent |
| --------- | -------------- | -------------- |
| 100%      | 0px            | 0px            |
| 150%      | 107px          | **0px**        |
| 200%      | 246px          | 69px           |

So giving the text its width back stops mobile layout breaking at 150% text entirely, and improves
200% by 72%. It does _not_ remove the need for word breaks: with the indent reduced and the breaks
suppressed, RFC 9000 still stretches 301px sideways at default text size, because of URLs.

## Finding 4: hard chunking orphans characters in ordinary prose

Once a word passes the length gate, it is not only broken at meaningful boundaries — whatever
remains is sub-divided every 16 characters by `chunkStringAtLengths()`. In prose with no separators
to break at, that lands mid-word:

```
"data confidentiality, integrity"         → confidentiality|,
"the interoperability of implementations" → interoperabilit|y
"see acknowledgements."                   → acknowledgement|s|.
```

So a comma can begin a line, and a single letter can be left on one. This matters beyond
tidiness: orphaned characters are the exact problem cited in the code comments as the reason
`overflow-wrap: anywhere` was rejected in favour of `<wbr>` — "in table headings it'll linewrap
just the 'n' in 'description'". The current approach reproduces the very fault it was chosen to
avoid, and does so in body text rather than only in table headings.

The same fault had a second instance, in identifiers rather than prose. A break was offered
after an underscore, but the run length was measured on the fragment _including_ that underscore, so
a ten-letter first segment exceeded a ten-character limit and was subdivided mid-word:

```
"connection_id"        → connec|tion_id
"connection_ids"       → connec|tion_|ids
"connection_id_length" → connec|tion_|id_|length
```

A trailing separator is itself a break opportunity, so it does not count towards the run. The
three-character floor has one exception, for a named segment following an underscore, so
`connection_id` breaks as `connection_|id`. The exception requires a letter in the segment: RFC
9000's frame-types table has cells reading `___1`, where the underscores mark a footnote rather than
separate a name.

The original cause is that one constant serves three different decisions at once
([rfc-html.ts#L324](https://github.com/ietf-tools/red/blob/main/precomputer/src/tasks/rfc-html.ts#L324)):
whether a word is long enough to break at all, the minimum length for the camelCase rule, and how
finely to sub-divide whatever is left. Those are independent questions — "is this word a problem?"
is not the same as "how small should the pieces be?". They have since been split into separate
constants.

## Finding 5: URLs are the category that genuinely needs breaking

Every token that overflows at default text size is a URL or a long numeric literal. The widest
cases run to 1,000–2,100px against 168px of available width:

| Token                                                            | Needs  | Has   | Where                                                                          |
| ---------------------------------------------------------------- | ------ | ----- | ------------------------------------------------------------------------------ |
| `https://www.researchgate.net/profile/...traffic.pdf`            | 2103px | 168px | [RFC 9505](https://www.rfc-editor.org/info/rfc9505/#section-10)                |
| `7268387242956068905493238078880045343536...`                    | 1311px | 264px | [RFC 9496](https://www.rfc-editor.org/info/rfc9496/#section-5.1-2.1.1)         |
| `https://datatracker.ietf.org/meeting/interim-2018-icnrg-03/...` | 1262px | 168px | [RFC 9064](https://www.rfc-editor.org/info/rfc9064/#section-10.2)              |
| `\Segment\Tracks\TrackEntry\ContentEncodings\...`                | 1162px | 272px | [RFC 9559](https://www.rfc-editor.org/info/rfc9559/#section-5.1.4.1.31.12-1.6) |

#498 explicitly accepts URL breaking, so this category is not in dispute. It does mean that
"remove all word breaks" is not available as an outcome: suppressing them entirely causes RFC 9000
to overflow by 429px at default text size, which is a horizontal scrollbar on every phone.

## Finding 6: the split length is pinned by enlarged text, not by tables

Tables, ABNF and artwork sit in horizontally scrolling containers, so a token that exceeds its cell
scrolls rather than stretching the page. They set no ceiling on the split length.

Measured over 54 documents at a 320px viewport, with scroller-internal overflow counted separately:

| Trigger / run     | Breaks | 100% | 150% | 200% | Of which in a scroller |
| ----------------- | ------ | ---- | ---- | ---- | ---------------------- |
| 14 / 10 (current) | 15,921 | 0    | 4    | 135  | 0                      |
| 16 / 10           | 15,668 | 0    | 4    | 197  | 0                      |
| 20 / 10           | 14,634 | 0    | 20   | 726  | 15                     |
| 24 / 10           | 14,178 | 0    | 85   | 945  | 24                     |

At default text size every candidate is clean. The constraint appears at enlarged text: raising the
trigger from 14 to 20 removes 8% of insertions and takes tokens that no longer fit at 200% text from
135 to **726**, none of it inside a scroller.

So the ceiling is
[WCAG SC 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) support. The reduction
in insertions that a higher trigger offers is real, but it is paid for entirely by readers at
enlarged text.


## Finding 7: what else breaks mobile layout

With the dominant overflow source gone, the remaining ones become measurable. A second audit
(`website/scripts/layout/mobile-audit.ts`, 40 documents at 320px) plus causal testing of each candidate fix
gives the following.

**At default text size, the sampled documents no longer overflow at all.** Every 100% measurement
across the audit reads zero. Everything below is a 200%-text problem, which is
[SC 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) territory rather than
ordinary phone use.

**At 200% text, 40 of 80 page measurements still overflow.** Three causes were confirmed by applying
each candidate fix alone and measuring the change in page overflow:

| Cause                                                                             | Overflow removed | Biggest single case    |
| --------------------------------------------------------------------------------- | ---------------- | ---------------------- |
| `dl > dt` float + `dd` indent on **all** definition lists, not just `.references` | 193px            | RFC 8975: 166px → 15px |
| `h1` document title cannot wrap                                                   | see below        | RFC 9325: 238px → 50px |
| `ol`/`ul` em-based indentation, compounding when nested                           | 66px             | RFC 9114: 53px → 32px  |

Applied together across 8 documents, total page overflow falls from 860px to 365px. They are
complementary — no single one dominates — and nothing reaches zero, so 200% text remains imperfect.

The title heading is rendered _outside_ `.rfc-content`, so a scoped selector cannot reach it.
Allowing the heading itself to wrap is worth 238px → 50px on RFC 9325 and 110px → 0px on RFC 8750.

The `dl` case applies to every definition list, not just `.references`: `dl > dt { float: left }`
puts `Proxy-Authentication-Info` in Appendix D of RFC 9110 in a floated term box 224px wide with a
32px indent beside it, reaching 112px past a 320px screen.

**The pattern behind all of these is em-based spacing.** Indents and padding expressed in `em` grow
with the reader's text size while the screen does not: `8em` on reference definitions, `2em` on
lists (plus `1em` per nesting level), `2em` of padding on asides. The reference indent was the worst
instance, not a special case.

## Finding 8: a dotted name that is not allowed to wrap

[RFC 9525 section 6.1.2](https://www.rfc-editor.org/info/rfc9525/#section-6.1.2-2.3) contains
`<code>mail.isp.example</code>`. At 200% text on a 320px screen it needs **307px inside a 208px list
item** and has **no break opportunities at all**, while `_imaps.isp.example` on the next line wraps
cleanly.

To see it: open that anchor at a locked 320px width (not device emulation, which shrink-to-fits and
hides overflow) with browser zoom at 200%. In devtools:

```js
const li = document.getElementById('section-6.1.2-2.3')
li.scrollWidth - li.clientWidth  // 111
[...li.querySelectorAll('code')].map((c) => [c.textContent, c.querySelectorAll('wbr').length])
// [['isp.example', 0], ['mail.isp.example', 0], ['_imaps.isp.example', 3]]
```

The cause was the length gate depending on where a word sits: it measured each word including the
whitespace before it, so a word carried an extra character mid-sentence but not as an element's
first content. `mail.isp.example` is exactly 16 characters
and the gate is `length > 16`; as the sole content of its `<code>` element there is no preceding
space to push it over, so it fails by one character:

```
<code>mail.isp.example</code>   → mail.isp.example        (no breaks)
<p>at mail.isp.example</p>      → at mail|.isp|.example   (three breaks)
```

This matters beyond the single case. It shows the off-by-one has _visible_ consequences, not merely
wasted insertions — and it shows the length gate is asking the wrong question.
A dotted DNS name is not a dictionary word; it has natural break points at its periods regardless of
how long it is. Periods are already a placement rule in `chunkString()`, but nothing reaches that
code unless a length or identifier trigger fires first.

Measured over 8 documents (16,290 distinct words), adding "contains an internal dotted name with a
letter in each segment" as a trigger catches 21 new words — `mail.isp.example`, `isp.example`,
`app.example`, `www.example.com`, `user@isp.example`, `rsalz@akamai.com`, `*.co.uk` — and damages no
prose. Requiring a letter in each segment is what excludes section cross-references (`19.15`),
decimals and dotted numbers, which are short, fit already, and would gain nothing from a break.

Two nearby rules were measured and rejected. Triggering on any url-ish character catches 264 new
words dominated by `HTTP/3`, `and/or`, `N/A` and `request/response` — breaking `and/or` into
`and` + `/or` is the orphaning of Finding 4, reintroduced. Triggering on any period at all catches
1,538 prose words including `connection.`, `(e.g.,` and the author initials `J.`, `M.`, `Ed.`, which
would put a lone `.` at the start of a line — the objection #424 raised about leading underscores.

## Finding 9: where to insert breaks, and how the split length was chosen

### How a break location is decided

Insertion happens in two stages.

**First, does this word get broken at all?** A word qualifies if it is longer than the trigger
length, contains an underscore, is a camelCase run at or over the camelCase minimum, or is a
machine-readable name — a dotted name whose segments contain letters (`mail.isp.example`), or a
string carrying both an internal dot and an internal slash (`10.17487/RFC9000`). The last rule is
new: periods were always a _placement_ rule but never a trigger, so a 16-character DNS name as the
sole content of a `<code>` element received no breaks at all and overflowed a narrow list item.

**Second, where in the word?** Break opportunities are placed _before_ URL-style separators
(`/ : @ = ? % \ - ( ) .`), _after_ runs of underscores — that placement was the outcome of
[#424](https://github.com/ietf-tools/red/issues/424), so a wrapped line never begins with `_` — and
at camelCase humps. Whatever run is left with no separator to break at is then subdivided.

Two rules govern that subdivision, both added as a result of this work. A separator-free run is
split into **evenly sized** pieces rather than filled to the limit with a short remainder, so 26
characters at a limit of 10 becomes 9/9/8 rather than 10/10/6. And any fragment shorter than three
characters is **folded back into its neighbour**, which removes the break rather than stranding it.
Together these eliminate `interoperabilit|y`, `confidentiality|,` and `acknowledgement|s|.` — the
orphaned characters that were the stated reason for rejecting `overflow-wrap` in the first place, and
which our own hard-chunking was reproducing in body text.

A third rule decides _what may be subdivided at all_. A run that reads as a word — letters, at most
one internal hyphen, apostrophe or slash, no longer than twenty characters — is never split at a
fixed length, because there is no good place to split it. The slash is admitted because a word pair
joined by one, such as `request/response`, is prose a reader expects whole. Runs containing digits or several separators are
machine strings, where an arbitrary break point is the only option available. The test has to be
exact in both directions: too loose and `10.7551/mitpress/7617.003.0006` reduces to `mitpress`,
protecting machine strings that need to wrap — 185 break opportunities in RFC 9000 alone.

### How the split length was measured

Rather than regenerate the corpus once per candidate, the browser is asked the question directly:
for every word that carries a break, what is the widest **unbreakable run** a given configuration
would leave, and does that run fit the width its container actually offers? A configuration keeps
narrow-screen support when every run fits; the number of breaks it inserts measures how intrusive it
is. The simulation mirrors the production chunker, including even distribution, the
minimum-fragment merge and the prose guard, so the figures describe what ships rather than an
idealisation.

Measured over **54 documents** sampled across the xml2rfc range (8650–10042, every 25th; six
measurements failed on unissued numbers such as RFC 10000 and are excluded), at a 320px viewport —
the width [WCAG 2.2 SC 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) is
assessed at. "Overflowing" counts tokens whose widest run would not fit.

| Trigger / chunk       | Breaks | @100% | @150% | @200%   | Worst @200% | In a scroller |
| --------------------- | ------ | ----- | ----- | ------- | ----------- | ------------- |
| 16 / 16 (previous)    | 15,549 | 0     | 4     | 208     | 181px       | 0             |
| 16 / 12               | 15,595 | 0     | 4     | 201     | 181px       | 0             |
| 16 / 10               | 15,668 | 0     | 4     | 197     | 181px       | 0             |
| 16 / 8                | 16,013 | 0     | 4     | 195     | 181px       | 0             |
| **14 / 10 (current)** | 15,921 | 0     | 4     | **135** | 181px       | 0             |
| 14 / 8                | 16,266 | 0     | 4     | 133     | 181px       | 0             |
| 12 / 10               | 15,921 | 0     | 4     | 135     | 181px       | 0             |
| 8 / 8                 | 16,266 | 0     | 4     | 133     | 181px       | 0             |
| 20 / 16               | 14,516 | 0     | 20    | 736     | 183px       | 15            |
| 24 / 16               | 14,071 | 0     | 85    | 955     | 205px       | 24            |

Tokens inside a horizontally scrolling container are counted separately, not as overflow: a table or
ABNF block is meant to exceed its container, so counting it conflates "does not fit" with "breaks
the page".

### What the numbers say

**Only the trigger moves the needle.** Holding it at 16 and tightening the run length from 16 to 8
takes overflow at 200% text from 208 tokens to 195 — 6%. Dropping the trigger from 16 to 14 at the
same run length takes it from 197 to **135**, a 31% reduction, for 1.6% more break opportunities.
The trigger decides which words are touched at all; the run length only decides how finely the
already-touched ones subdivide, and the prose guard means most of them are no longer subdivided at
all.

**Below 14 nothing changes.** Triggers of 8, 12 and 14 produce identical results, because no word in
the corpus changes category between them. The real choice is "14" versus "16" versus "20 or above",
not a tuning dial, and 14 is the top of the plateau.

**Raising it is a bad trade.** A trigger of 20 saves 8% of breaks and costs 726 overflowing tokens at
200% text; 24 costs 945. Both are clean at default text, so the price is paid entirely by readers at
enlarged text.

**Nothing overflows at default text at any of these settings.** The floor is at enlarged text: of
the 135 tokens still too wide at 200%, 133 stay too wide at every setting measured, because each is a
single run wider than the space it sits in however it is divided. Those need container width, not a
shorter run length.


### What was chosen

**Trigger 14 / run length 10**, against a previous 16 / 16: tokens overflowing at 200% text fall from
208 to 135, for 2.4% more break opportunities, with no change at 100% or 150%.

Placement matters as much as the threshold. Hyphens end their chunk rather than starting the next, so
no wrapped line begins with punctuation — the objection
[#424](https://github.com/ietf-tools/red/issues/424) raised about underscores — and a slash joining
two ordinary words is not a break point at all.


## Finding 10: breaks switch off where the word provably fits

A break only earns its place when its word might not fit, and that depends on the width of the
container the word sits in. The precomputer measures each word and gives every `<wbr>` inside it a
class naming the width that word needs, in em. `connection_id` measures 6.6em, which with the
estimate margin falls in the 8em grouping, so it is broken after the underscore and the break carries
`wordsize-8`:

```html
connection_<wbr class="wordsize-8">id
```

CSS then hides that break wherever the containing block is at least 9.6em — the grouping's 8em
ceiling plus a buffer:

```css
@container (min-width: 9.6em) {
  wbr.wordsize-8 {
    display: none;
  }
}
```

One rule per word size grouping, no matrix: if the container is at least as wide as the grouping's
ceiling, the word provably fits, so suppression can never cause an overflow. The **container** is queried rather than
the viewport, so the decision accounts for indentation, table cells and nesting — which matter more
than screen width. Blocks (`p`, `li`, `dd`, `dt`, `blockquote`, `aside`) are the query containers;
the word itself cannot be, since making it `inline-block` would stop it wrapping. Words wider than
the largest grouping get `wordsize-wide`, which has no rule, so their breaks always stay live. Where container queries are
unsupported the rules are dropped and every break stays live.

Widths come from the committed font metrics, in the style the word actually renders in — monospace
inside `code`, bold inside `strong`, `th`, `dt` and headings — since a body-font estimate for
monospace would be too small and would suppress a break that was needed. A 1.05 factor absorbs the
error in summing per-character advances, and the query threshold carries a further 1.2 over the
grouping's ceiling for a substituted font or added letter spacing.

Measured at 320px, suppression never made a page or element wider:

| Document | Text | Words suppressed | Breaks suppressed | Page overflow |
| --- | --- | --- | --- | --- |
| RFC 9000 | 100% | 531 (58%) | 672 (40%) | 0px → 0px |
| RFC 9110 | 100% | 334 (56%) | 447 (32%) | 0px → 0px |
| RFC 9525 | 100% | 40 (23%) | 61 (11%) | 0px → 0px |
| RFC 9000 | 200% | 25 (3%) | 25 (1%) | 37px → 37px |
| RFC 9110 | 200% | 3 (1%) | 7 (1%) | 47px → 47px |

**This is what answers the complaint in #498.** At default text size 40% of RFC 9000's breaks and
32% of RFC 9110's are switched off, because the container is wide enough for the whole word. At 200%
text almost none are, because there they are load-bearing. The rule the reader meets is no longer
"this word is long" but "this word does not fit here".

The class is prefixed `wordsize-` rather than `w-` because Tailwind is loaded on these pages and
would otherwise apply a width to the element.


## Finding 11: bracketed citations wrap when they should not

RFCs cite their references inline as `[RFC3629]` or `[OAM-CONS]`, where the name links to the entry
in the references section. On a narrow screen these break across lines — `[QUIC-` on one line and
`INVARIANTS]` on the next — even though the whole citation is short enough to fit. It reads as a
typo rather than a wrap.

**Why it happens.** The citation is not one unbreakable token: the reference names contain hyphens
and periods, and those are break opportunities in their own right, before any of our own word breaks
are considered. `[QUIC-INVARIANTS]` offers a break after the hyphen to any browser, unprompted.
Measured at a 320px viewport, **6% of citations wrap at default text size and 14% at 200%**.

**The markup already has somewhere to hang a fix.** xml2rfc emits the citation wrapped in a span of
its own:

```html
<span>[<a href="#QUIC-INVARIANTS" class="xref">QUIC-INVARIANTS</a>]</span>
```

89 of them in RFC 9000 alone. The span has no class, so CSS cannot currently select it — but the
precomputer can recognise the shape (a `span` whose children are the text `[`, one link, and the
text `]`) and label it, after which `white-space: nowrap` keeps the citation together.

**Surveyed across 6 documents, 338 distinct citations.** The shape is consistent: every one has
exactly one link, none contains two, and trailing punctuation always sits _outside_ the span
(`</a>]</span>.`). That last detail matters and needs no extra handling — there is no whitespace
between `]` and the following `,`, so the browser will not break there anyway.

**A size cap is needed.** Keeping a citation whole is only safe while it fits:

|                 | Width in em |
| --------------- | ----------- |
| Median          | 5.1         |
| 90th percentile | 8.3         |
| Widest          | 11.7        |

At 200% text in a narrow column, the long ones genuinely do not fit — `[NIST-SP-800-133r2]` needs
10.2em against 8.5em available — so those must keep their break opportunities. A cap of **8em keeps
89% of citations whole** and leaves the rest to wrap as they do now.

The precomputer marks qualifying spans and the stylesheet holds them together. On RFC 9000, 70 of 89 citations qualify and none of them wraps any
more; the 19 too wide to fit wrap as before, and page overflow is unchanged at both text sizes.

**Interaction with word breaks is negligible.** Five of the 338 citations contain an inserted word
break, and only one of those is under the cap: `[NIST_PQ]`, which the underscore rule catches. At
4.8em it fits in every context measured, so suppressing its break costs nothing. The other four —
`[QUIC-MANAGEABILITY]`, `[IANA.core-parameters]`, `[Unicode-14.0.0-bidi]`,
`[NIST-SP-800-133r2]` — are all above the cap and keep their breaks. The two mechanisms barely meet,
and where they do the cap decides.

## Alternatives considered

**`overflow-wrap: break-word`**, suggested in #498. Keeps mobile layout intact at default text
size on RFC 9000, and measured against the shipped rules it removes the residual overflow at 200%
text — but the browser picks the break points: it breaks at whatever character reaches the margin,
orphaning single letters, the fault that motivated `<wbr>`, and it cannot express "break this URL at
its path separators". Anything that depends on engine breaking behaviour is out on principle.

Adding it _alongside_ the inserted breaks, as a fallback that only acts on what still does not fit,
was considered and rejected for a further reason: it would silently absorb any case where the
inserted breaks are inadequate, so the mechanism could no longer be seen to be working or failing.
Whether the breaks are doing their job is the question this report exists to answer, and a fallback
that hides the answer is worse than the overflow it prevents.

**Zero-width space (U+200B)** breaks identically but is a real character, so it is copied with the
text and corrupts pasted identifiers and URLs.

**Soft hyphen (`&shy;`)** renders a visible hyphen, misrepresenting identifiers that contain none.

**No hint at all** leaves long tokens unbreakable, which breaks mobile layout — the case all of
this is trying to prevent.

**Suppressing breaks above a width threshold**, also from #498, and expressed in `em` so it tracks
text size rather than device width. CSS cannot tell a URL break from an
identifier break, so it suppresses both, and URLs still need breaking inside narrow containers on
wide screens; separating them means marking the two kinds when the document is generated.

## What each option costs

Measured at 320px on real documents, as horizontal page overflow:

| Option                             | default text | 200% text  |
| ---------------------------------- | ------------ | ---------- |
| as shipped                         | 0px          | 34-47px    |
| every break ignored                | 81-625px     | 481-1570px |
| breaks above the threshold ignored | 0px          | 34-47px    |
| the browser's own breaking instead | 0px          | 0-16px     |

Why each was or was not taken is in [Alternatives considered](#alternatives-considered).

## Changes made

No RFC text is altered. What changes is layout and where a line may break — not a neutral
difference, since a break inside a word changes how it reads.

### Website

**Definition lists flow as one line on narrow screens.** Below 60em the term no longer floats into a
column that the definition has to clear with a fixed indent — the pair wraps as a single line, with
xml2rfc's empty `dd.break` spacer serving as the entry separator. Definitions containing block
content (nested lists, tables, artwork, more than one paragraph) keep their own line and merely lose
the indent. RFC 9110's index went from **23 items past a 320px viewport at 200% text to none**; RFC
8975 from 166px of page overflow to 15px. Above 60em the floated layout is unchanged, which keeps a
1024px tablet rendering as before.

The threshold is in `em` rather than `px` so it tracks the reader rather than the device: relative
units in a media query resolve against the browser's initial font size (`rem` behaves identically
there) — the user's own browser setting or zoom level — and never against the page's own `:root`, so
a reader at enlarged text keeps the narrow layout on a wider screen
([Media Queries 4 §1.3](https://www.w3.org/TR/mediaqueries-4/#units)).

**The inline indent xml2rfc emits is overridden.** It arrives as a `style="margin-left:7.0em"`
attribute on each `dd` — 13 to 493 per document — which no stylesheet rule can beat without
`!important`. RFC 9025 went from 147px of page overflow to 85px, and 9 overflowing definitions to
none.

**Asides and blockquotes use narrow horizontal padding below 60em.** `2em` each side plus a `2em`
left margin consumed 192px of a 272px column at 200% text. The note paragraph in RFC 9000
[section 10.2.1](https://www.rfc-editor.org/info/rfc9000/#section-10.2.1-6.1) went from **79px of
usable width to 175px**.

**Lists indent less on narrow screens**, mobile-first `1em` widening to `2em` from 40em — in em, so
the breakpoint tracks the reader's text size rather than device width.

**The document title wraps.** It is rendered outside `.rfc-content`, so it takes a Tailwind utility
on the heading rather than a stylesheet rule. RFC 9325 went from 238px of page overflow to 50px, RFC
8750 from 110px to none.

Three duplicate rule pairs were consolidated along the way — `dl > dt`, `.references dd` and `aside`
each had a second copy hundreds of lines below the first, silently overriding it. That pattern is
why narrow-screen overrides appeared to do nothing on `dlParallel` lists.

### Precomputer

- The length gate no longer depends on **where a word sits** in a paragraph.
- The single `16` became three constants — trigger, camelCase minimum, run length — and the run
  length is now 10.
- Runs that offer no break of their own are subdivided **evenly**, fragments shorter than three
  characters are folded back rather than stranded, and runs that read as words are not subdivided at
  all. `interoperabilit|y`, `confidentiality|,` and `acknowledgement|s|.` are gone.
- **Dotted and path-like machine names break at their separators** regardless of length, so
  `mail.isp.example` and `10.17487/RFC9000` wrap where they previously could not.
- The `dd` indent moves to a class and a custom property, so the website can decide when to apply it.
- **Each `<wbr>` carries a `wordsize-` class** naming how much room its word needs, so CSS can
  hide it where the container is wide enough: `<wbr class="wordsize-8">` for a word up to 8em wide.
  40% of RFC 9000's breaks and 32% of RFC 9110's are inactive at default text size, and almost all
  stay active at 200%.

## Potential future work

- **The remaining overflow at 200% text is container work, not word breaking.** 135 tokens across
  the 54-document sample are still too wide for the space they have, and 133 of those stay too wide
  at every trigger and run length measured. What is left to give them is width.

## Limitations

- Token widths are measured per fragment; a token split across a nested element boundary is
  measured in parts, which understates rather than overstates its width.
- The responsive rules track the reader's text size through em-based media queries, which respond
  to browser zoom and browser font settings but not to the in-page text-spacing control, since that
  adjusts spacing rather than font size. A reader who raises it above its default keeps the
  wide-screen indentation. The default setting already meets
  [WCAG 1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), so this
  affects only the range beyond that requirement, and no page overflow was measured between 1000px
  and 1600px even at the maximum setting.
- "Load-bearing" is a geometric test — whether a token fits — not a judgement about whether a break
  is _desirable_. #498's argument that breaking identifiers misrepresents authorial intent is a
  separate consideration, and the fact that a break is load-bearing at 200% text does not by itself
  settle it.
