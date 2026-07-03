import type { Component } from 'vue'
import {
  GraphicsAtomFeed,
  GraphicsCheckmark,
  GraphicsCopy,
  GraphicsDensityCompact,
  GraphicsDensityDense,
  GraphicsDensityFull,
  GraphicsDismiss,
  GraphicsFilterFilled,
  GraphicsHide,
  GraphicsListAlt,
  GraphicsLoading,
  GraphicsMail,
  GraphicsMasksTheater,
  GraphicsPreviewLink,
  GraphicsRssFeed,
  GraphicsSearch,
  GraphicsSpeechBubble,
  GraphicsValueNone,
  GraphicsWarning
} from '#components'

/**
 * Maps the Iconify icon names that were previously rendered by `@nuxt/icon`'s
 * `<Icon>` component to the local `components/Graphics/` SVG components that
 * replaced them. Used to resolve icon names that arrive as strings from data
 * (e.g. document content, menu definitions) rather than being known at author
 * time.
 */
const GRAPHICS_ICON_BY_NAME: Record<string, Component> = {
  'eos-icons:loading': GraphicsLoading,
  'fa-solid:th-list': GraphicsDensityDense,
  'fa6-solid:masks-theater': GraphicsMasksTheater,
  'f7:rectangle-grid-1x2-fill': GraphicsDensityFull,
  'fluent:checkmark-12-filled': GraphicsCheckmark,
  'fluent:copy-16-regular': GraphicsCopy,
  'fluent:dismiss-24-filled': GraphicsDismiss,
  'fluent:filter-24-filled': GraphicsFilterFilled,
  'fluent:mail-all-20-regular': GraphicsMail,
  'fluent:preview-link-16-regular': GraphicsPreviewLink,
  'fluent:search-12-filled': GraphicsSearch,
  'fluent:warning-24-filled': GraphicsWarning,
  'garden:speech-bubble-plain-fill-12': GraphicsSpeechBubble,
  'ic:sharp-rss-feed': GraphicsRssFeed,
  'material-symbols:list-alt': GraphicsListAlt,
  'mdi:hide': GraphicsHide,
  'radix-icons:value-none': GraphicsValueNone,
  'vaadin:list': GraphicsDensityCompact,
  'vscode-icons:file-type-atom': GraphicsAtomFeed
}

/**
 * Resolves an Iconify-style icon name (e.g. `fluent:search-12-filled`) to its
 * local Graphics component, or `undefined` if there is no mapping.
 */
export const resolveGraphicsIcon = (name: string): Component | undefined => GRAPHICS_ICON_BY_NAME[name]
