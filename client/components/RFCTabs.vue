<template>
  <TabsRoot
    v-model="selectedTab"
    class="min-h-0 flex flex-col"
    @change="changeTab"
  >
    <TabsList class="flex flex-row gap-5 border-b-2 border-gray-400">
      <TabsIndicator class="absolute" />
      <TabsTrigger
        v-if="props.hasTableOfContents"
        :class="[
          DEFAULT_CLASS,
          {
            [SELECTED_CLASS]: selectedTab === 0,
            [UNSELECTED_CLASS]: selectedTab !== 0
          }
        ]"
        :value="0"
      >
        Contents
      </TabsTrigger>
      <TabsTrigger
        :class="[
          DEFAULT_CLASS,
          {
            [SELECTED_CLASS]: selectedTab === 1,
            [UNSELECTED_CLASS]: selectedTab !== 1
          }
        ]"
        :value="1"
      >
        About this RFC
      </TabsTrigger>
      <TabsTrigger
        :class="[
          DEFAULT_CLASS,
          {
            [SELECTED_CLASS]: selectedTab === 2,
            [UNSELECTED_CLASS]: selectedTab !== 2
          }
        ]"
        :value="2"
      >
        Erratum
      </TabsTrigger>
    </TabsList>
    <TabsContent
      v-if="props.hasTableOfContents"
      :value="0"
      :class="TAB_CONTENT_CLASS"
    >
      <slot name="slot0" />
    </TabsContent>
    <TabsContent
      :value="1"
      :class="TAB_CONTENT_CLASS"
    >
      <slot name="slot1" />
    </TabsContent>
    <TabsContent
      :value="2"
      :class="TAB_CONTENT_CLASS"
    >
      <slot name="slot2" />
    </TabsContent>
  </TabsRoot>
</template>

<script setup lang="ts">
import {
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsRoot,
  TabsTrigger
} from 'reka-ui'
import type { RfcBucketHtmlDocument, RfcCommon } from '~/utilities/rfc'

type Props = {
  rfc: RfcCommon
  rfcBucketHtmlDoc: RfcBucketHtmlDocument
  hasTableOfContents: boolean
}

const props = defineProps<Props>()

const selectedTab = defineModel<number>()

function changeTab(index: number) {
  selectedTab.value = index
}

const TAB_CONTENT_CLASS = 'flex flex-col min-h-0'
const DEFAULT_CLASS = 'py-4 whitespace-nowrap border-b-2'
const SELECTED_CLASS =
  'text-shadow-bold border-b-blue-900 dark:border-b-white font-medium'
const UNSELECTED_CLASS = 'border-b-transparent text-gray-800 dark:text-gray-300'
</script>