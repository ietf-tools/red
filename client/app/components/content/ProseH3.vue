<template>
  <Heading
    v-bind="$attrs"
    :has-internal-link="true"
    level="3"
    class="pt-3 pb-1 px-2"
  >
    <slot />
  </Heading>
</template>
