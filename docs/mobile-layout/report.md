# Mobile layout in RFC documents

RFCs were written for desktop resolutions. Modern RFC HTML supports reflowing text, but RFCs are
not designed for mobile layout or for accessibility requirements such as WCAG and text resizing.

RFC-Editor.org's `/info/rfcN/` route reads the published `/rfc/rfcN.html` files and adapts them so
that they do not **break mobile layout**: content stretching the page sideways on a narrow screen,
or at enlarged text, so the document has to be scrolled horizontally as well as vertically. Word
breaks that let text reflow are a necessary means to that end, but not the end itself.

This document is a draft. It describes the current algorithm for inserting `<wbr>` (word break)
elements inside words, which turns the text `example.com` into the HTML `example<wbr>.com` and
gives the browser somewhere to break a word across lines. It also records why the CSS
`overflow-wrap` approaches were set aside.

## Summary

1. **At a 320px viewport and default text size, most break opportunities go unused, as expected.**
   A `<wbr>` is taken only when its word would otherwise run past the end of the line, so unused is
   the normal state. Across 120 documents 71% are unused, rising to 99% for tokens that owe their
   breaks to the underscore rule alone
   ([Finding 1](#finding-1-the-rules-differ-sharply-in-how-often-they-matter)).
2. **At 200% text the picture reverses**: 79% of breaks become load-bearing. `PATH_CHALLENGE`
   never breaks the layout at default size and does so in 42 of its 44 appearances at 200%
   ([Finding 2](#finding-2-the-picture-reverses-at-200-text)).
3. **What broke mobile layout was mostly indentation carried from the xml2rfc stylesheet, not word
   length.** A fixed `8em` reference indent grew with the reader's text size while the screen did
   not, leaving **16px** of available width at 200%
   ([Finding 3](#finding-3-what-broke-mobile-layout-was-indentation-not-word-length)).
4. **Giving the text its width back achieved more than any change to word breaking.** At default
   text size nothing in the sample breaks mobile layout any more ([Changes made](#changes-made)).
5. **The rules also had a defect**: the same word broke differently depending on where it appeared
   in a paragraph ([Finding 7](#finding-7-a-dotted-name-that-was-not-allowed-to-wrap)).
6. **URLs are the one category that needs breaking at every size**
   ([Finding 5](#finding-5-urls-are-the-category-that-needs-breaking)).
7. **Bracketed citations no longer wrap mid-name.** Those narrow enough to fit, 85% of them, are
   held together ([Finding 10](#finding-10-bracketed-citations-wrapped-when-they-should-not)).
8. **Breaks are suppressed where the word provably fits.** Each `<wbr>` carries a class naming the
   width its word needs, and CSS suppresses it once the containing block is that wide. 40% of RFC
   9000's breaks are suppressed at default text size, almost none at 200%
   ([Finding 9](#finding-9-breaks-are-suppressed-where-the-word-provably-fits)).

## What we insert, and why

[`ensureWordBreaks()`](https://github.com/ietf-tools/red/blob/main/precomputer/src/tasks/rfc-html.ts)
inserts `<wbr>` elements when RFC HTML is generated; each marks a place a line _may_ break. `<pre>`
and `<svg>` are skipped, so code and artwork are never touched. Why `<wbr>` rather than a character
or a CSS property is in [Alternatives considered](#alternatives-considered).

A word receives breaks if any of these hold, as of 09/2026. These are the values the code holds
today, not settled policy:

| Rule         | Condition                                                                     |
| ------------ | ----------------------------------------------------------------------------- |
| Length       | longer than the trigger length, 14 characters                                  |
| Underscore   | contains `_`, at any length                                                    |
| camelCase    | a lower-to-upper transition, at 14 characters or more                         |
| Machine name | a dotted name (`mail.isp.example`) or one with both a dot and a slash, any length |

Qualifying is necessary but not sufficient: a run that reads as a word is never subdivided at a
fixed length (the **prose guard**). Where breaks land is
[Finding 8](#finding-8-where-to-insert-breaks-and-how-the-run-length-was-chosen).

## The goal: not breaking mobile layout

The requirement comes from [WCAG 2.2 SC 1.4.10
Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) rather than from small phones as
such: content readable without
horizontal scrolling at **320 CSS pixels**, which is a 1280px desktop window at 400% zoom. [SC 1.4.4
Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) adds that text must stay
usable at 200%. "Mobile" here therefore covers a phone at default text and a desktop at enlarged
text alike. A 45-character phrase does fit comfortably on a phone, and our measurements agree; but
a phone at default text is not the width the guidelines are measured at.
All measurements below use 320px, at both default and 200% text.

## How this was measured

`website/scripts/word-breaks/wbr-measure.ts --corpus=broad` (reported by `wbr-report.ts`) drives a
real browser over published pages on www.rfc-editor.org, records page overflow with the word breaks
enabled and again with every one removed, and for every token containing a break measures its
unbroken width against the width available in its containing block. Artwork is hidden during
measurement: it never receives breaks and is deliberately allowed to scroll.

A **break** is one `<wbr>`; a **token** is a whitespace-delimited string carrying at least one; a
**word** is the pre-insertion string. A break is **load-bearing** when its token cannot fit unbroken
in the available width, and **inert** when the token fits either way.

Corpus: 120 documents sampled across RFC 8650–9700, the range published in xml2rfc format (earlier
RFCs are plain text inside `<pre>` and receive no breaks), covering 90,908 `<wbr>` elements and
13,587 distinct tokens. Raw data is in [`data/`](./data/); Findings 1, 2, 3 and 5 and these corpus
figures are generated into [`data/generated-tables-broad.md`](./data/generated-tables-broad.md).

## Finding 1: the rules differ sharply in how often they matter

Most break opportunities go unused by design, since a break is taken only when its word falls at
the end of a line. No rule can be judged on its unused count alone, but the rules can be compared
with each other. At a 320px viewport and default text size, 29% of the 13,587 tokens carrying a
break are load-bearing, spread very unevenly:

| Insertion rule                                      | Tokens | Load-bearing | Inert | % inert |
| --------------------------------------------------- | ------ | ------------ | ----- | ------- |
| length rule only                                    | 7021   | 3560         | 3461  | 49%     |
| under the trigger length (leading-space off-by-one) | 3153   | 4            | 3149  | 100%    |
| length rule + underscore or camelCase               | 1803   | 405          | 1398  | 78%     |
| underscore rule only                                | 1456   | 8            | 1448  | 99%     |
| camelCase rule only                                 | 154    | 0            | 154   | 100%    |

The length rule is load-bearing about half the time, the underscore rule almost never, and
camelCase never. At this size the underscore rule inserts breaks that are almost never needed.

## Finding 2: the picture reverses at 200% text

The same tokens, same 320px viewport, with text at 200%:

| Insertion rule                                      | Tokens | Load-bearing | Inert | % inert |
| --------------------------------------------------- | ------ | ------------ | ----- | ------- |
| length rule only                                    | 7021   | 6391         | 630   | 9%      |
| under the trigger length (leading-space off-by-one) | 3153   | 2422         | 731   | 23%     |
| length rule + underscore or camelCase               | 1803   | 1453         | 350   | 19%     |
| underscore rule only                                | 1456   | 381          | 1075  | 74%     |
| camelCase rule only                                 | 154    | 100          | 54    | 35%     |

Overall, the load-bearing share rises from 29% to 79%. `PATH_CHALLENGE` appears 44 times in RFC9000.
At default text it needs 145px and has 196–296px, overflowing **zero** times. At 200% it needs
287px against 272px and overflows in **42 of 44** appearances, including [section
8.2](https://www.rfc-editor.org/info/rfc9000/#section-8.2-6); the two that fit are a heading and a
table cell inside a scroller. `CONNECTION_CLOSE`, `MAX_ACK_REQUESTS`, `H3_CONNECT_ERROR` and
`AEAD_AES_256_GCM` behave the same way, needing 312–332px against 272px.

So the underscore rule's breaks go unused on a phone at default text and are needed at the sizes
the guidelines require. Both cases have to be accommodated.

## Finding 3: what broke mobile layout was indentation, not word length

The relevant question is how little room a part of the document has, not how long a word is. The
six narrowest contexts at a 320px viewport, of sixteen measured, holding 12,792 of the 13,587
tokens:

| Container | Tokens measured | Median available width | Narrowest |
| --------- | --------------- | ---------------------- | --------- |
| `<th>`    | 14              | 116px                  | 39px      |
| `<dd>`    | 6017            | 168px                  | 96px      |
| `<dt>`    | 486             | 193px                  | 40px      |
| `<td>`    | 467             | 196px                  | 34px      |
| `<li>`    | 662             | 264px                  | 108px     |
| `<p>`     | 5146            | 296px                  | 40px      |

A `<dd>`, the commonest context for these tokens, had 168px where a paragraph had 296px. The cause
was in the xml2rfc stylesheet, which we maintain as a fork: the reference term floated left with
`min-width: 7em` and the definition cleared it with `margin-left: 8em`, fixed em amounts that grew
with the reader's text size while the screen did not. Measuring RFC 9000's references section at
320px, then page overflow before and after flowing term and definition as one wrapping line:

| Text size | Available width in a reference entry | Page overflow before | After   |
| --------- | ------------------------------------ | -------------------- | ------- |
| 100%      | 168px                                | 0px                  | 0px     |
| 150%      | 92px                                 | 107px                | **0px** |
| 200%      | **16px**                             | 246px                | 69px    |

Sixteen pixels is roughly one character, which no word-breaking rule can work with. Giving the width
back stopped mobile layout breaking at 150% entirely and cut 200% by 72%,
but did not remove the need for breaks: with the indent reduced and breaks suppressed, RFC 9000
still stretches 301px sideways at default text size, because of URLs. The rules as they now stand
are in [`xml2rfc.css`](https://github.com/ietf-tools/red/blob/main/website/app/assets/css/xml2rfc.css).

## Finding 4: hard subdividing orphaned characters in ordinary prose

Once a word passed the trigger length, whatever remained after the meaningful boundaries was
subdivided every 16 characters. In prose with no separators, that landed mid-word:

```
"data confidentiality, integrity"         → confidentiality|,
"the interoperability of implementations" → interoperabilit|y
"see acknowledgements."                   → acknowledgement|s|.
```

A comma could begin a line and a single letter be left on one. That is the fault the code comments
cite as the reason `overflow-wrap: anywhere` was rejected in favour of `<wbr>` ("it'll linewrap just
the 'n' in 'description'"), reproduced in body text. Identifiers had the same fault by another
route: the run length counted the fragment _including_ its trailing underscore, so `connection_id`
became `connec|tion_id`. A trailing separator no longer counts, and the three-character floor has
one exception for a lettered segment after an underscore, so `connection_id` breaks as
`connection_|id`.

## Finding 5: URLs are the category that needs breaking

Every token that overflows at default text size is a URL, a path or a long numeric literal. The
widest cases run to 1,000–2,100px against 168px of available width:

| Token                                                            | Width  | Available | Where                                                                          |
| ---------------------------------------------------------------- | ------ | ----- | ------------------------------------------------------------------------------ |
| `https://www.researchgate.net/profile/...traffic.pdf`            | 2103px | 168px | [RFC 9505](https://www.rfc-editor.org/info/rfc9505/#section-10)                |
| `7268387242956068905493238078880045343536...`                    | 1311px | 264px | [RFC 9496](https://www.rfc-editor.org/info/rfc9496/#section-5.1-2.1.1)         |
| `https://datatracker.ietf.org/meeting/interim-2018-icnrg-03/...` | 1262px | 168px | [RFC 9064](https://www.rfc-editor.org/info/rfc9064/#section-10.2)              |
| `\Segment\Tracks\TrackEntry\ContentEncodings\...`                | 1162px | 272px | [RFC 9559](https://www.rfc-editor.org/info/rfc9559/#section-5.1.4.1.31.12-1.6) |

URL breaking is not in dispute. It also means removing all word breaks is not an option: doing so
puts 429px of overflow on RFC 9000 at default text size, a horizontal scrollbar on every phone.

## Finding 6: what else broke mobile layout

With the reference indent dealt with, the layout audit (`website/scripts/layout/mobile-audit.ts`,
output in [`data/mobile-audit-broad.md`](./data/mobile-audit-broad.md)) showed what still
overflowed, all at enlarged text rather than default size. Three causes: `dl > dt { float: left }`
with a `dd` indent on every definition list, not only `.references`; the `h1` document title,
rendered outside `.rfc-content`, which could not wrap; and `ol`/`ul` indentation in `em`,
compounding when lists nest. The pattern was em-based spacing growing with text size while the
screen did not; the reference indent was the worst instance, not a special case. Fixes are in
[Changes made](#changes-made).

## Finding 7: a dotted name that was not allowed to wrap

[RFC 9525 section 6.1.2](https://www.rfc-editor.org/info/rfc9525/#section-6.1.2-2.3) contains
`<code>mail.isp.example</code>`. At 200% text on a 320px viewport it needed **307px inside a 208px
list item** and received **no breaks at all**, while `_imaps.isp.example` on the next line wrapped.

The trigger length measured each word including its preceding whitespace, so a word carried an
extra character mid-sentence but not as an element's first content. `mail.isp.example` is exactly 16
characters and the trigger was then 16: alone in its `<code>` it failed by one, while
`at mail.isp.example` in a paragraph received three breaks. The off-by-one had visible consequences,
and a length test was the wrong test for this case: a dotted DNS name has natural break points at
its periods however long it is, but nothing reached the period placement rule unless a length,
underscore or camelCase rule fired first.

Adding "contains an internal dotted name with a letter in each segment" as a trigger catches 21 new
words across 8 documents (`mail.isp.example`, `www.example.com`, `user@isp.example`, `*.co.uk`) and
affects no prose; the letter requirement excludes cross-references (`19.15`) and decimals, which fit
already. Two nearby rules were rejected: any URL-like character catches 264 words dominated by
`HTTP/3`, `and/or` and `request/response`, reintroducing Finding 4's orphaning; any period catches
1,538 prose words including `connection.`, `(e.g.,` and initials, putting a lone `.` at the start of
a line.

## Finding 8: where to insert breaks, and how the run length was chosen

Whether a word is broken at all is decided by the four rules in [What we insert, and
why](#what-we-insert-and-why); the machine-name rule is the new one, added for Finding 7.

**Where in the word.** Before most separators (`/ : @ = ? % \ ( ) .`), after runs of underscores and
hyphens (the outcome of [#424](https://github.com/ietf-tools/red/issues/424), so no wrapped line
begins with `_` or `-`), and at camelCase humps. A slash between two ordinary words is not a break
point. Periods keep the break before them, so a dotted name divides as `mail|.isp|.example`;
breaking after the period would read as a sentence ending.

Whatever run has no separator is subdivided under three rules added by this work: split **evenly**
rather than filled to the run length with a remainder (26 characters at a run length of 10 gives
9/9/8, not 10/10/6); any fragment under three characters **folded back** rather than stranded, which
eliminates `interoperabilit|y`, `confidentiality|,` and `acknowledgement|s|.`; and a run that reads
as a word (letters, at most one internal separator, at most twenty characters) **never**
subdivided. That last test must be exact both ways: too loose and `10.7551/mitpress/7617.003.0006`
reduces to `mitpress`, protecting a machine name that needs to wrap (185 breaks in RFC 9000 alone);
too strict and `confidentiality,` is subdivided mid-word. Underlying the old behaviour, one constant
served three decisions that are now separate constants: trigger length, camelCase minimum and run
length.

### How the run length was measured

Rather than regenerate the corpus per candidate, a script asks the browser: for every word carrying
a break, what is the widest **unbreakable run** a configuration would leave, and does it fit its
container? The simulation mirrors the production subdivider, including the prose guard. Measured at
320px over **54 documents** (every 25th across 8650–10042 gives 56, two of them unissued). Seven
trigger lengths were crossed with six run lengths; these ten rows bear on the choice. Tokens inside
a horizontal scroller are counted separately, since a table is meant to exceed its container.

| Trigger / run length | Breaks | @100% | @150% | @200%   | Worst @200% | Excluded: in a scroller |
| --------------------- | ------ | ----- | ----- | ------- | ----------- | ----------------------- |
| 16 / 16 (before)      | 15,549 | 0     | 4     | 208     | 181px       | 0                       |
| 16 / 12               | 15,595 | 0     | 4     | 201     | 181px       | 0                       |
| 16 / 10               | 15,668 | 0     | 4     | 197     | 181px       | 0                       |
| 16 / 8                | 16,013 | 0     | 4     | 195     | 181px       | 0                       |
| **14 / 10 (after)**   | 15,921 | 0     | 4     | **135** | 181px       | 0                       |
| 14 / 8                | 16,266 | 0     | 4     | 133     | 181px       | 0                       |
| 12 / 10               | 15,921 | 0     | 4     | 135     | 181px       | 0                       |
| 8 / 8                 | 16,266 | 0     | 4     | 133     | 181px       | 0                       |
| 20 / 10               | 14,634 | 0     | 20    | 726     | 183px       | 15                      |
| 24 / 10               | 14,178 | 0     | 85    | 945     | 205px       | 24                      |

**Only the trigger length matters much.** Holding it at 16 and tightening the run length from 16 to
8 takes 200% overflow from 208 tokens to 195; dropping the trigger to 14 at run length 10 takes it
to **135**, a 31% reduction for 1.6% more breaks. **Below 14 nothing changes**: 8, 12 and 14 measure
identically. **Raising it costs more than it saves**: 20 saves 8% of breaks and costs 726
overflowing tokens, 24 costs 945, and both are clean at default text, so the cost falls entirely on
readers at enlarged text. What remains at 200% is container width, not run length ([Potential future
work](#potential-future-work)).

**Trigger 14 / run length 10** was chosen: 200% overflow falls from 208 to 135 for 2.4% more breaks,
with no change at 100% or 150%. The lower trigger adds 94 breaks per two documents, **92 of them
immediately after a hyphen**, where a browser already breaks unprompted. Not emitting those would
remove 12.7% of insertions with no effect on wrapping in Chromium, but would depend on every engine
breaking at a hyphen, which was never measured.

## Finding 9: breaks are suppressed where the word provably fits

A break is only useful when its word might not fit its container. The precomputer measures
each word and gives every `<wbr>` inside it a class naming the width that word needs, in em.
`connection_id` measures 6.6em, which with the **estimate factor** (1.05, absorbing the error in
summing per-character advances) falls in the 8em word size grouping:

```html
connection_<wbr class="wordsize-8">id
```

```css
@container (min-width: 9.6em) {
  wbr.wordsize-8 {
    display: none;
  }
}
```

The 9.6em is the grouping's 8em ceiling plus a buffer of 1.2 for a substituted font or
added letter spacing. If the container is at least as wide as the ceiling the word provably fits, so
suppression can never cause an overflow. The **container** is queried rather than the viewport, so
indentation, table cells and nesting count. Blocks (`p`, `li`, `dd`, `blockquote`, `aside`) are the
query containers; the word itself cannot be, since `inline-block` would stop it wrapping, and `dt`
cannot be either, since inline-size containment removes a term's intrinsic width and a floated or
grid-placed term then shrinks to its widest word and overlaps its definition (RFC 8900, "NOTE 1:").
Words past the largest grouping get `wordsize-wide`, which has no rule, so their breaks stay active,
as they do where container queries are unsupported. Widths come from the committed font metrics in
the style the word renders in (monospace in `code`, bold in `strong`, `th`, `dt` and headings). The
class is prefixed `wordsize-` rather than `w-` because Tailwind would otherwise apply a width.

Measured at 320px, suppression never made a page or element wider:

| Document | Text | Words suppressed | Breaks suppressed | Page overflow |
| --- | --- | --- | --- | --- |
| RFC 9000 | 100% | 531 (58%) | 672 (40%) | 0px → 0px |
| RFC 9110 | 100% | 334 (56%) | 447 (32%) | 0px → 0px |
| RFC 9525 | 100% | 40 (23%) | 61 (11%) | 0px → 0px |
| RFC 9000 | 200% | 25 (3%) | 25 (1%) | 37px → 37px |
| RFC 9110 | 200% | 3 (1%) | 7 (1%) | 47px → 47px |

**This is what changes for the reader.** At default text size 40% of RFC 9000's breaks are
suppressed because the container is wide enough; at 200% almost none are, because there they are
load-bearing. The rule a reader meets is no longer "this word is long" but "this word does not fit
here".

## Finding 10: bracketed citations wrapped when they should not

RFCs cite references inline as `[RFC3629]` or `[OAM-CONS]`. On a narrow screen these broke across
lines, `[QUIC-` then `INVARIANTS]`, even where the whole citation would have fitted, because a
hyphen is a break opportunity any browser takes unprompted. Surveyed at 320px across 20 documents
(585 citations, 366 distinct names; `website/scripts/layout/citation-survey.ts`, output in
[`data/citation-survey.md`](./data/citation-survey.md)), **7% wrapped at default text size and 31%
at 200%** (39 and 179 of 585). The survey must run against a corpus that does not yet carry the
citation class, or it measures the fix rather than the problem.

xml2rfc wraps each citation in a CSS classless span (`[`, one link, `]`); the precomputer recognises
that shape and adds a class, after which `white-space: nowrap` holds the citation together.
Trailing punctuation always sits outside the span with no whitespace before it, so it needs no
handling.

**A width cap is needed**, because keeping a citation whole is only safe while it fits. Widths are
median 5.94em, 90th percentile 8.94em, widest 13.63em (`[KSK_ROLLOVER_ARCHIVES]`); at 200% in a
narrow column the long ones do not fit and must keep their breaks. A cap of **8em keeps
85% whole** (500 of 585). On RFC 9000, 70 of the 89 spans in the source qualify and none now wraps.
Word breaks and the cap barely meet: of the six documents first examined, five citations contained
an inserted break and only `[NIST_PQ]` was under the cap. Where they meet, the cap decides.

## Alternatives considered

- **Do nothing** leaves long tokens unbreakable, which is the original problem.
- **`overflow-wrap: break-word` and its variants** were the initial approach, but browsers apply
  them differently, and in complex RFCs they produced many orphaned letters and poor reflow. On RFC
  9000 the property keeps mobile layout intact at default text size and removes the residual
  overflow at 200%, but the browser picks the break points, orphaning single letters, and it cannot
  express "break this URL or notation at its separators". RFC 10042's title is the plain case:
  `Post-Quantum/Traditional` wrapped as `Post-Quantum/Tradi` under the CSS fallback, because no
  browser treats a slash as a break point. Serving text is the site's primary purpose, so the
  effort was justified; if browser word breaking improves, dropping `<wbr>` insertion would be
  welcome.
- **Zero-width space (U+200B)** and **soft hyphen (`&shy;`)** instead of `<wbr>` are real
  characters, so they are copied with the text and corrupt pasted identifiers and URLs.
- **Suppressing breaks above a width threshold** was taken, in the form Finding 9 describes: a
  viewport threshold alone cannot tell a URL break from an identifier break and knows nothing of the
  indentation, nesting and table cells that decide the width a word actually has, so the container
  is queried instead.

## What each option costs

Measured at 320px on RFC 9000, 9110 and 9505, as horizontal page overflow, from a run against the
site with the container changes in place. The corpus data in [`data/`](./data/) predates those
changes and records far larger overflow for the same documents (246px, 223px and 290px with breaks
at 200%). The ranges span three documents, so they are wider than Finding 9's two-document figures:

| Option                             | default text | 200% text  |
| ---------------------------------- | ------------ | ---------- |
| breaks as inserted                 | 0px          | 34-47px    |
| every break ignored                | 81-625px     | 481-1570px |
| the browser's own breaking instead | 0px          | 0-16px     |

A viewport threshold was measured too and is not listed: at a 320px viewport it never applies, so it
is indistinguishable from the first row.

## Changes made

No RFC text is altered; what changes is layout and where a line may break.

### Website

- **Definition lists flow as one line below 60em.** The term no longer floats into a column the
  definition must clear; the pair wraps as one line, with xml2rfc's empty `dd.break` spacer as the
  separator. Definitions holding block content keep their own line and lose only the indent. RFC
  9110's index went from **23 items past a 320px viewport at 200% text to none**, RFC 8975 from
  166px of page overflow to 15px. Above 60em nothing changes, so a 1024px tablet renders as before.
- **`dlParallel` lists are a two-column grid above 60em.** Terms take the first column at their own
  width and definitions the second, so a term can no longer overlap a definition whose indent was
  measured without it; the measured indent is switched off inside the grid, since the column gap
  already separates the two. Below 60em the inline flow above applies, where a grid column could
  wrap under.
- **The inline indent xml2rfc emits is moved out of the way.** `style="margin-left:7.0em"` on each
  `dd` (13 to 493 per document) beats any stylesheet rule, so the precomputer rewrites it as a class
  and custom property the stylesheet applies conditionally. RFC 9025 went from 147px of overflow to
  85px.
- **Asides and blockquotes take narrow padding below 60em.** `2em` each side plus a `2em` left
  margin consumed 192px of a 272px column at 200%. RFC 9000's note paragraph went from **79px of
  available width to 175px**.
- **Lists indent less on narrow screens**, `1em` widening to `2em` from 40em.
- **The document title wraps**, via a Tailwind utility since it is rendered outside `.rfc-content`.
  RFC 9325 went from 238px of overflow to 50px, RFC 8750 to none. The title receives none of the
  precomputer's breaks and the CSS fallback breaks wherever the edge falls, so the website now
  inserts a break after each slash and similar separator in the title (RFC 10042,
  `Post-Quantum/Traditional`).

Every threshold is in `em` so it tracks the reader rather than the device: relative units in a media
query resolve against the browser's initial font size, never the page's `:root`, so a reader at
enlarged text gets the narrow layout on a wider screen
([Media Queries 4 §1.3](https://www.w3.org/TR/mediaqueries-4/#units)). Three duplicate rule pairs
(`dl > dt`, `.references dd`, `aside`) each had a second copy hundreds of lines below the first,
silently overriding it; they were consolidated, which is why narrow-screen overrides had appeared to
do nothing on the lists xml2rfc marks `dlParallel`.

### Precomputer

- The trigger length no longer depends on **where a word sits** in a paragraph.
- One `16` became three constants: trigger length (now 14), camelCase minimum and run length (now
  10).
- Separator-free runs are subdivided **evenly**, fragments under three characters folded back, and
  runs that read as words left whole.
- **Machine names break at their separators** regardless of length.
- The `dd` indent moves to a class and a custom property.
- **Bracketed citations are held on one line where they fit**, via `class="reference-citation"` and
  `white-space: nowrap`, under an 8em cap from the font metrics.
- **Each `<wbr>` carries a `wordsize-` class** naming the width its word needs, so CSS suppresses it
  where the container is wide enough.

## Potential future work

- **The remaining overflow at 200% text is container work, not word breaking.** 135 tokens across
  the 54-document sample are still too wide for the space they have, and 133 of those stay too wide
  at every trigger and run length measured. What is left to give them is width.

## Limitations

- Token widths are measured per fragment; a token split across a nested element boundary is measured
  in parts, which understates rather than overstates its width.
- The em-based media queries respond to browser zoom and font settings but not to the site's own
  text-spacing control, which adjusts spacing rather than font size, so a reader who raises it above
  its default keeps the wide-screen indentation. The default already meets
  [WCAG 1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), and no
  page overflow was measured between 1000px and 1600px even at the maximum setting.
- "Load-bearing" is a geometric test of whether a token fits, not a judgement about whether a break
  is _desirable_. Whether breaking identifiers misrepresents authorial intent is a
  separate consideration, and a break being load-bearing at 200% does not by itself settle it.
