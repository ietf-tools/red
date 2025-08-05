<template>
  <div class="bg-blue-200 dark:bg-blue-900 pt-7 overflow-hidden relative">
    <div
      class="absolute pointer-events-none inset-0 overflow-hidden text-white"
    >
      <GraphicsIETFMotif
        class="absolute w-[90vw] h-[90vh] -left-[5vw] -top-[20vh] print:hidden"
        :opacity="0.04"
      />
      <GraphicsIETFMotif
        class="absolute w-[40vw] h-[40vh] left-[67vw] md:left-[57vw] xl:left-[47vw] top-[2vh] print:hidden"
        :opacity="0.1"
      />
    </div>
    <div class="container mx-auto text-white pt-5">
      <slot />
    </div>
  </div>
</template>
