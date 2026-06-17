<template>
  <div class="rr-diagram-wrap">
    <!-- Zoom controls — outside aria-hidden so AT can reach buttons. -->
    <div class="rr-zoom-bar" role="group" :aria-label="`Diagram zoom for ${ruleName}`">
      <button
        type="button"
        class="rr-zoom-btn"
        :disabled="zoom <= MIN_ZOOM"
        aria-label="Zoom out"
        @click="adjustZoom(-STEP)">
        −
      </button>
      <output class="rr-zoom-value">{{ zoomLabel }}</output>
      <button
        type="button"
        class="rr-zoom-btn"
        :disabled="zoom >= MAX_ZOOM"
        aria-label="Zoom in"
        @click="adjustZoom(+STEP)">
        +
      </button>
    </div>

    <!-- aria-hidden: AT gets the text-form ABNF above the diagram, not the SVG. -->
    <div class="rr-diagram-scroll" aria-hidden="true">
      <component :is="svgVNode" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, type VNode } from 'vue'
import { layoutRule } from './layout/layout'
import { renderDiagram } from './svg/render'
import type { SvgEl } from './svg/render'
import type { AbnfRule } from './parser/types'

const props = defineProps<{
  rule: AbnfRule
  ruleMap: Map<string, AbnfRule>
  ruleName: string
}>()

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const STEP = 0.25

const zoom = ref(1)
const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`)

function adjustZoom(delta: number) {
  zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((zoom.value + delta) * 100) / 100))
}

const diagram = computed(() => {
  const layoutNode = layoutRule(props.rule, props.ruleMap)
  return renderDiagram(layoutNode)
})

// Convert SvgEl descriptors to Vue VNodes. We use h() because SVG namespace
// elements require it — Vue's template compiler emits the correct namespace
// for inline SVG but <component :is="tag"> inside an SVG block is unreliable.
function toVNode(el: SvgEl): VNode {
  const children = [...(el.text ? [el.text] : []), ...el.children.map(toVNode)]
  return h(el.tag, el.attrs, children.length ? children : undefined)
}

const svgVNode = computed(() => {
  const d = diagram.value
  return h(
    'svg',
    {
      class: 'rr-diagram-svg',
      focusable: 'false',
      viewBox: `0 0 ${d.width} ${d.height}`,
      width: Math.round(d.width * zoom.value),
      height: Math.round(d.height * zoom.value),
      xmlns: 'http://www.w3.org/2000/svg'
    },
    [h('g', { class: 'rr-diagram-content' }, d.elements.map(toVNode))]
  )
})
</script>

<style>
/* ── container ────────────────────────────────────────────────────────────── */
.rr-diagram-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.rr-diagram-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 0;
}

.rr-diagram-svg {
  display: block;
}

/* ── rail and connectors ──────────────────────────────────────────────────── */
.rr-diagram-content path {
  stroke: var(--rr-rail, #444);
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
}

/* ── terminal ─────────────────────────────────────────────────────────────── */
.rr-terminal {
  fill: var(--rr-terminal-bg, #d8f3dc);
  stroke: var(--rr-terminal-border, #2c6e49);
  stroke-width: 1.5;
}
.rr-terminal-text {
  font: bold 12px monospace;
  text-anchor: middle;
  fill: var(--rr-terminal-fg, #1b4332);
  pointer-events: none;
}

/* ── non-terminal ────────────────────────────────────────────────────────── */
.rr-nonterminal {
  fill: var(--rr-nonterminal-bg, #dbeafe);
  stroke: var(--rr-nonterminal-border, #1d4e89);
  stroke-width: 1.5;
}
.rr-nonterminal-text {
  font: 12px monospace;
  text-anchor: middle;
  fill: var(--rr-nonterminal-fg, #1e3a5f);
  pointer-events: none;
}
.rr-link {
  cursor: pointer;
}
.rr-link:hover .rr-nonterminal {
  fill: var(--rr-nonterminal-hover, #bfdbfe);
}

/* ── comment / prose (ellipse) ───────────────────────────────────────────── */
.rr-comment {
  fill: var(--rr-comment-bg, #f0f0f0);
  stroke: var(--rr-comment-border, #888);
  stroke-width: 1;
}
.rr-comment-text {
  font: italic 11px sans-serif;
  text-anchor: middle;
  fill: var(--rr-comment-fg, #555);
  pointer-events: none;
}

.rr-prose {
  fill: var(--rr-prose-bg, #fafafa);
  stroke: var(--rr-prose-border, #999);
  stroke-width: 1;
  stroke-dasharray: 4 2;
}
.rr-prose-text {
  font: italic 11px sans-serif;
  text-anchor: middle;
  fill: var(--rr-prose-fg, #666);
  pointer-events: none;
}

/* ── zoom ────────────────────────────────────────────────────────────────── */
.rr-zoom-bar {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.rr-zoom-btn {
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid currentColor;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  opacity: 0.65;
  transition: opacity 0.1s;
}
.rr-zoom-btn:hover:not(:disabled) {
  opacity: 1;
}
.rr-zoom-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}
.rr-zoom-value {
  font-family: monospace;
  font-size: 0.75rem;
  min-width: 2.6rem;
  text-align: center;
  display: inline-block;
}

/* ── dark mode ───────────────────────────────────────────────────────────── */
html.dark {
  --rr-rail: #aaa;
  --rr-terminal-bg: #1b4332;
  --rr-terminal-border: #52b788;
  --rr-terminal-fg: #d8f3dc;
  --rr-nonterminal-bg: #1e3a5f;
  --rr-nonterminal-border: #60a5fa;
  --rr-nonterminal-fg: #bfdbfe;
  --rr-nonterminal-hover: #1e40af;
  --rr-comment-bg: #2a2a2a;
  --rr-comment-border: #777;
  --rr-comment-fg: #ccc;
  --rr-prose-bg: #222;
  --rr-prose-border: #666;
  --rr-prose-fg: #bbb;
}
</style>
