// The rating, subscriber and set counts come from live Reef data in the bucket JSON, so an RFC
// gaining its first rating or set changes the height of the row under its title and shifts the
// whole document. Not reachable by stubbing the request, because it is fetched during SSR. Hiding
// the row and pinning it to a fixed height excludes the volatile content while holding the rest of
// the page steady. The height is the same at every viewport because it only has to be constant
// from one run to the next, not to fit what is inside.
export const REEF_STATS_MASK_CSS = `
  [data-reef-stats] {
    visibility: hidden;
    height: 96px;
    overflow: hidden;
    position: relative;
  }

  [data-reef-stats]::before {
    content: 'DYNAMIC CONTENT HIDDEN FOR TEST STABILITY';
    visibility: visible;
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-family: sans-serif;
    font-size: 20px;
    color: #666;
    background: repeating-linear-gradient(45deg, #eee, #eee 10px, #ddd 10px, #ddd 20px);
  }
`
