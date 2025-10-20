<template>
  <AccordionRoot type="single" :collapsible="true">
    <slot />
  </AccordionRoot>
</template>

<script setup lang="ts">
import { AccordionRoot } from 'reka-ui'
</script>
