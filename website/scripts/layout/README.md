# Layout audit scripts

These scripts check that RFC pages lay out correctly at sizes nobody tests by hand: narrow phones,
large text, and the widths where a responsive rule changes behaviour.

Both write their findings to `docs/mobile-layout/data/`, and both take document selection from
[`../rfc-samples.ts`](../rfc-samples.ts).

## `mobile-audit.ts` — what overflows a narrow screen

Loads each document at a locked 320px viewport, at normal and enlarged text, and reports every
element extending past the content column. It attributes each overflow to the element and the
document position responsible, so a number points at a cause.

```sh
node scripts/layout/mobile-audit.ts --origin=http://localhost:3000
```

**Emulation hides the fault.** Device emulation shrinks the page to fit, so overflow disappears from
the measurement while remaining real for a reader. The viewport is locked instead.

**Not every wide box is a bug.** Diagrams and ABNF blocks sit in horizontal scrollers and are
_meant_ to exceed their container. An early version of this script ignored that and reported a
1,077px overflow in RFC 9110 that did not exist — the real excess was 16px. `isExempt()` now treats
an element as exempt when its own `overflow-x` clips, and does not blame a container for a scrolling
descendant. Any finding here should be confirmed against the page before it is acted on.

## `wide-screen-check.ts` — did a narrow-screen fix change wide layout?

The definition-list and reference-list rules are scoped to a `max-width` media query, so above the
threshold they should change nothing. This checks that rather than assuming it.

```sh
node scripts/layout/wide-screen-check.ts
```

It compares **prod against the dev server** at 1024px and 1280px: prod serves the previous CSS, dev
the new one, and both read the same published documents, so a difference at a wide viewport is caused
by the CSS. It reports computed layout properties as distinct value tuples, so a document merely
having more of something is not a difference.

**Why not screenshot baselines.** A baseline recorded today encodes today's CSS as correct. That
guards against future drift, but it cannot say whether today's change was safe — which is the
question being asked.

**This equivalence expires.** Once the corpus is republished, precomputed markup differs between
prod and dev too, and differences tracing to a newly added class are expected rather than
regressions. Run it before a republish, or read the results knowing which classes are new.
