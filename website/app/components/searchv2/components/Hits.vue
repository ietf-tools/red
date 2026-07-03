<template>
  <div :class="classNames?.root">
    <slot v-if="isEmpty" name="empty">{{ emptyLabel }}</slot>
    <ol v-else :class="classNames?.list">
      <li v-for="(item, index) in items" :key="keyFor(item, index)" :class="classNames?.item">
        <slot name="item" :item="item" :index="index" />
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { useHits } from '../connectors/useHits'
import type { ClassNames, SearchHit } from '../types'

type Props = {
  classNames?: ClassNames
  /** Message shown when there are no results. */
  emptyLabel?: string
  /** Key extractor. Defaults to `id`/`objectID`, falling back to the index. */
  itemKey?: (hit: SearchHit, index: number) => string | number
}

const props = withDefaults(defineProps<Props>(), {
  classNames: undefined,
  emptyLabel: 'No results.',
  itemKey: undefined
})

const { items, isEmpty } = useHits()

const keyFor = (item: SearchHit, index: number): string | number => {
  if (props.itemKey) return props.itemKey(item, index)
  const id = item.id ?? item.objectID
  return typeof id === 'string' || typeof id === 'number' ? id : index
}
</script>
