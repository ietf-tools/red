<template>
  <!--
  Template for RFC thumbnail screenshots.
   
  1) be standalone (no imports except for TS).
  2) adhere to Satori CSS support https://www.npmjs.com/package/satori
    Satori isn't a real browser and it can't understand moderately complex CSS.
    But it's much faster and more suitable for headless node image generation.

  Use dev server to prototype changes because it's non-obvious what might break
  with changes.
   -->
  <div style="display: flex; flex-direction: column; padding: 30px">
    <img :src="logoBase64Uri" style="position: absolute; left: 0; top: 0" />
    <h1 style="font-size: 50px; padding: 0; margin: 110px 0 0 0; line-height: 1.3">
      <span style="font-weight: normal; padding: 0 16px 0 0">RFC</span>
      {{ rfc.number }}
    </h1>
    <h2 style="font-size: 70px; font-weight: normal; margin: 0; padding: 0">{{ rfc.title }}</h2>
    <p style="font-size: 30px; margin: 8px 0 0 4px; padding: 0; font-style: italic; color: #333">
      <span v-for="(author, authorIndex) in rfc.authors" :key="authorIndex">
        <span>{{ author.titlepage_name }}</span>
        <span v-if="author.is_editor">, Ed.</span>
        <span v-if="authorIndex < rfc.authors.length - 1" style="padding: 0 12px 0 0">,</span>
      </span>
    </p>
    <div
      v-if="rfc.abstract"
      style="display: flex; flex-direction: column; font-size: 30px; line-height: 1.5; margin: 8px 0 0 0">
      <p v-for="line in rfc.abstract.split('\n')">{{ line }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'

type Props = {
  rfc: RfcCommon
  logoBase64Uri: string
}

defineProps<Props>()
</script>
