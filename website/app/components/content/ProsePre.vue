<template>
  <pre
    :class="`inline-block max-w-screen overflow-x-auto p-1 bg-gray-50 dark:bg-blue-950 ${
      '' // in <pre> make sure no whitespace before/after <slot />
    }`"><slot
  /></pre>
</template>
