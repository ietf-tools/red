<template>
  <Heading
    v-bind="$attrs"
    :has-internal-link="true"
    level="2"
    class="pt-4 pb-2 px-2 max-w-[var(--max-text-block-width)]">
    <slot />
  </Heading>
</template>
