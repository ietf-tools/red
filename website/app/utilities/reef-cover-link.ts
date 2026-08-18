// Shared styling for the dialog triggers in the Reef row on an RFC page — the "Subscribe" and
// "Add to set" buttons, which are laid out as cards whose whole area is the clickable target.
//
// Its own module rather than any one feature's, because it belongs to none of them: it's here so
// the two triggers can't drift apart, and so neither has to import the other's feature logic to
// look right.

export const COVER_LINK_STYLE_CLASS = `${
  // the card background colour layer
  "before:absolute before:content-[''] before:inset-0 before:rounded"
} ${
  // card background layer should be below the slots z-index
  'before:z-0'
} ${
  // the card cover link itself (increases clickable area of the link)
  "after:absolute after:content-[''] after:inset-0"
} ${
  // card cover link should be above the card background colour layer, so 40 is
  // an arbitrary choice.
  //
  // Generally slots content should be between these layers, so that means
  // z-index 1-39.
  //
  // however sometimes slot content intentionally rises above (eg RFCCard usage
  // of Card has Subseries links see RFC2119) and 'Show Abstract' buttons which
  // should be stacked above 40.
  'after:z-40'
} after:transition-all ${
  // card tint when focus/hover
  `hover:text-blue-400 focus:text-blue-400 dark:hover:text-blue-100 dark:focus:text-blue-100 hover:before:bg-sky-100 focus:before:bg-blue-25 dark:hover:before:bg-blue-900 dark:focus:before:bg-blue-900`
} ${
  // Link border
  `after:border-1 after:border-white dark:after:border-black after:rounded hover:after:border-blue-800 focus:after:outline-2 focus:after:outline-black`
}`

export const COVER_LINK_INNER_STYLE_CLASS = `relative z-1`
