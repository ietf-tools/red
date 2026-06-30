<template>
  <div class="container mx-auto pl-5 pr-3">
    <div class="absolute pointer-events-none inset-0 overflow-hidden">
      <GraphicsIETFMotif class="absolute z-100 w-[90vw] h-[90vh] -left-[10vw] top-[0vh] print:hidden" :opacity="0.04" />
      <GraphicsIETFMotif
        class="absolute z-100 w-[40vw] h-[40vh] left-[57vw] md:left-[47vw] xl:left-[37vw] top-[17vh] print:hidden"
        :opacity="0.04" />
    </div>
    <div class="sm:flex w-full">
      <Heading level="1" style-level="1" class="w-full md:pt-1 md:pl-2 xs:mt-5 md:mb-3 font-semibold text-balance">
        The official home of RFCs
      </Heading>
      <div class="self-end lg:text-right">
        <AValidHref
          href="/series/rfc/"
          class="rounded text-blue-100 border-1 border-transparent lg:text-white inline-block md:px-2 md:px-5 py-2 md:py-3 font-semibold whitespace-nowrap hover:bg-black focus:bg-black hover:border-white focus:border-white">
          What is an RFC?
          <GraphicsChevron class="-rotate-90 w-[16px] inline-block" />
        </AValidHref>
      </div>
    </div>

    <div class="lg:w-2/3 xl:w-1/2 mb-1 md:mb-2 md:pt-2 md:pl-2">
      <p class="hidden leading-6 lg:block pl-5 md:p-0 text-pretty">
        RFCs outline computer networking and Internet foundations, including
        <AValidHref :href="searchPathBuilder({ status: ['Internet Standard'] })">Internet Standards</AValidHref>
        and historical or informative content. They are published by the RFC Editor for the
        <AValidHref :href="IETF_URL_ORIGIN">
          <abbr title="Internet Engineering Task Force">IETF</abbr>
          <GraphicsNewWindowIcon class="text-lg align-middle ml-1" /> </AValidHref
        >,
        <AValidHref :href="IRTF_URL_ORIGIN">
          <abbr title="Internet Research Task Force">IRTF</abbr>
          <GraphicsNewWindowIcon class="text-lg align-middle ml-1" /> </AValidHref
        >,
        <AValidHref :href="IAB_URL_ORIGIN">
          <abbr title="Internet Architecture Board">IAB</abbr>
          <GraphicsNewWindowIcon class="text-lg align-middle ml-1" /> </AValidHref
        >, and
        <AValidHref href="/authors/rfc-independent-submissions/">
          <abbr title="Independent Submission Editor">ISE</abbr>
          <GraphicsNewWindowIcon class="text-lg align-middle ml-1" /> </AValidHref
        >, which collectively form the authoritative source for RFCs.
      </p>
      <IndexSubheaderSearchBox />
    </div>
  </div>
</template>

<script setup lang="ts">
import { IAB_URL_ORIGIN, IETF_URL_ORIGIN, IRTF_URL_ORIGIN, searchPathBuilder } from '~/utilities/url'
</script>
