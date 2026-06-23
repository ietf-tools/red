<template>
  <Heading
    v-bind="$attrs"
    :has-internal-link="true"
    level="4"
    class="pt-3 pb-1 px-2 max-w-[var(--max-text-block-width)]">
    <slot />
  </Heading>
</template>
