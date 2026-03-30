<template>
  <!--
   template needs to adhere to Satori CSS support
   https://www.npmjs.com/package/satori

   Use dev server to prototype changes
   -->
  <div style="display:flex;flex-direction:column;padding:30px">
    <h1 style="font-size:50px;padding:0;margin:0;line-height:1.3;">
      <span style="font-weight:normal;padding: 0 16px 0 0">RFC</span>
      {{ rfc.number }}   
    </h1>
    <h2 style="font-size:70px;font-weight:normal;margin:0;padding:0">{{ rfc.title }}</h2>
    <p style="font-size:30px;margin:16px 0 0 8px;padding:0;font-style:italic;color:#333">
      <span v-for="(author, authorIndex) in rfc.authors" :key="author.titlepage_name">
        {{ author.titlepage_name }}
        <span v-if="authorIndex < rfc.authors.length - 1" style="padding:0 12px 0 0">,</span>
        <span v-else>.</span>
      </span>
    </p>
    <p style="font-size:30px;line-height:1.5">{{ rfc.abstract }}</p>
  </div>
</template>

<script setup lang="ts">
import type { RfcCommon } from '../../../website/app/utilities/rfc-validators.ts'

type Props = {
  rfc: RfcCommon
}

defineProps<Props>()
</script>
