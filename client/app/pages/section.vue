<template>
  <div>
    <SectionHeader>
      <Heading level="1" class="w-full mt-0 mb-3 pl-5 md:p-0 text-balance">
        Section index page
      </Heading>
      <p class="leading-6 mb-10 pl-5 md:p-0 md:w-1/2">
        A Request for Comments is a publication in a series from the principal
        technical development and standards-setting bodies for the Internet.
      </p>
    </SectionHeader>
    <div class="container mx-auto mt-10">
      <div class="grid grid-cols-1 mt-3 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card href="/sdf" heading-level="3" has-cover-link>
          <template #headingTitle>Featured page title</template>
          <p class="text-base mt-2 text-blue-900 dark:text-white">
            Short description of the page here is it seems useful to show
          </p>
        </Card>

        <Card href="/sdf" heading-level="3" has-cover-link>
          <template #headingTitle>Featured page title</template>
          <p class="text-base mt-2 text-blue-900 dark:text-white">
            Short description of the page here is it seems useful to show
          </p>
        </Card>

        <Card href="/sdf" heading-level="3" has-cover-link>
          <template #headingTitle>Featured page title</template>
          <p class="text-base mt-2 text-blue-900 dark:text-white">
            Short description of the page here is it seems useful to show
          </p>
        </Card>

        <Card href="/sdf" heading-level="3" has-cover-link>
          <template #headingTitle>Featured page title</template>
          <p class="text-base mt-2 text-blue-900 dark:text-white">
            Short description of the page here is it seems useful to show
          </p>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
