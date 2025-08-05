<template>
  <NavigationMenuRoot
    v-model="currentNav"
    class="relative w-full z-90 justify-end content-end hidden lg:block"
    disable-hover-trigger
  >
    <NavigationMenuList
      class="m-0 flex gap-2 w-full justify-end list-none rounded-md"
    >
      <NavigationMenuItem v-for="(menuItem, index) in menuData" :key="index">
        <NavigationMenuLink
          v-if="menuItem.href && !menuItem.children"
          :href="menuItem.href"
          :aria-label="menuItem.label"
          class="hover:bg-blue-400 group flex select-none items-center justify-between gap-[2px] rounded-md px-4 py-3 text-[15px] leading-none outline-none focus:shadow-[0_0_0_2px]"
          @click="menuItem.click"
        >
          <Icon v-if="menuItem.icon" :name="menuItem.icon" />
        </NavigationMenuLink>

        <NavigationMenuTrigger
          v-if="!menuItem.href && menuItem.children"
          class="hover:bg-blue-400 group flex select-none items-center justify-between gap-2 rounded-md px-4 py-3 text-[15px] leading-none outline-none focus:shadow-[0_0_0_2px]"
          :aria-label="menuItem.label"
        >
          <Icon v-if="menuItem.icon" :name="menuItem.icon" />
          <span v-if="!menuItem.hideLabelDesktop">
            {{ menuItem.label }}
          </span>
          <GraphicsChevron
            v-if="!menuItem.hideDropdownIconDesktop"
            class="ml-1 top-[1px] text-blue-100 group-hover:text-white transition-transform duration-[150ms] ease-in group-data-[state=open]:-rotate-180"
          />
        </NavigationMenuTrigger>
        <NavigationMenuContent
          v-if="menuItem.children"
          class="data-[motion=from-start]:animate-enterFromLeft data-[motion=from-end]:animate-enterFromRight data-[motion=to-start]:animate-exitToLeft data-[motion=to-end]:animate-exitToRight absolute top-0 left-0 w-full min-w-3xs sm:w-auto py-1"
        >
          <ul class="list-none">
            <li
              v-for="(level0, level0Index) in menuItem.children"
              :key="`${index}.${level0Index}`"
              class="flex flex-col"
            >
              <NavigationMenuSub
                v-if="level0.children"
                :default-value="level0.label"
                class="z-100"
              >
                <NavigationMenuList>
                  <NavigationMenuItem
                    :value="`${index}.${level0Index}`"
                    class="flex flex-col"
                  >
                    <NavigationMenuTrigger :class="MENU_ITEM_CLASS">
                      <span>
                        <Icon v-if="level0.icon" :name="level0.icon" />
                        {{ level0.label }}
                      </span>
                      <GraphicsChevron
                        class="transition-transform text-blue-100 group-hover:text-white translate-y-[0.2em] duration-[150ms] ease-in group-data-[state=open]:-rotate-180"
                      />
                    </NavigationMenuTrigger>
                    <NavigationMenuContent
                      class="bg-gray-200 rounded-b-md mx-1 pb-1 inset-shadow-sm inset-shadow-gray-400 dark:bg-gray-700 dark:inset-shadow-gray-900"
                    >
                      <ul class="list-none">
                        <li
                          v-for="(level1, level1Index) in level0.children"
                          :key="`${index}.${level0Index}.${level1Index}`"
                          class="flex flex-col"
                        >
                          <NavigationMenuLink
                            v-if="level1.href"
                            :href="level1.href"
                            :class="[MENU_ITEM_CLASS, 'pl-5']"
                            @click="level1.click"
                          >
                            <Icon v-if="level1.icon" :name="level1.icon" />
                            {{ level1.label }}
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenuSub>
              <NavigationMenuLink v-else as-child>
                <A
                  v-if="level0.href"
                  :href="level0.href"
                  :class="MENU_ITEM_CLASS"
                  @click="level0.click"
                >
                  <span>
                    <Icon v-if="level0.icon" :name="level0.icon" />
                    {{ level0.label }}
                    <Icon
                      v-if="!isInternalLink(level0.href)"
                      name="fluent:window-new-20-regular"
                      class="text-lg absolute ml-1 -mt-1"
                    />
                  </span>
                </A>
                <button
                  v-else
                  type="button"
                  :class="MENU_ITEM_CLASS"
                  :aria-label="level0.activeLabelFn?.()"
                  @click="level0.click"
                >
                  <span class="flex items-center">
                    <Icon v-if="level0.icon" :name="level0.icon" />
                    <Icon
                      v-if="level0.isActiveFn?.()"
                      name="fluent:checkmark-12-filled"
                      class="inline-block w-[14px] h-[14px] mr-2"
                    />
                    <span
                      v-if="
                        level0.isActiveFn && !level0.isActiveFn() // render blank space
                      "
                      class="inline-block w-[14px] h-[14px] mr-2"
                    />
                    {{ level0.label }}
                  </span>
                </button>
              </NavigationMenuLink>
            </li>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    </NavigationMenuList>
    <div class="perspective-[2000px] absolute top-full left-0 flex w-full">
      <NavigationMenuViewport
        class="data-[state=open]:animate-scaleIn data-[state=closed]:animate-scaleOut relative h-(--reka-navigation-menu-viewport-height) w-full origin-[top_center] overflow-hidden rounded-md bg-white dark:bg-gray-800 transition-[width,_height] duration-300 translate-x-(--reka-navigation-menu-viewport-left) sm:w-(--reka-navigation-menu-viewport-width) border shadow-2xl"
      />
    </div>
  </NavigationMenuRoot>
</template>

<script setup lang="ts">
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuRoot,
  NavigationMenuSub,
  NavigationMenuTrigger,
  NavigationMenuViewport
} from 'reka-ui'
import { onMounted } from 'vue'
import { useMenuData } from './HeaderNavData'
import { isInternalLink, SEARCH_PATH } from '~/utilities/url'

const MENU_ITEM_CLASS =
  'group select-none flex justify-between rounded-md data-[state=open]:rounded-b-none mx-1 px-3 py-2 text-sm font-medium leading-none no-underline outline-none text-black dark:text-white hover:bg-blue-500 hover:text-white focus:bg-blue-500 focus:text-white'

const menuData = useMenuData()

const searchHref = ref<string>(SEARCH_PATH)

const route = useRoute()

function updateSearchLink() {
  // If there's a search box on the page just use it rather than linking to another page
  const searchElement = document.getElementById('search')

  const newSearchHref = searchElement ? '#search' : SEARCH_PATH
  if (newSearchHref !== searchHref.value) {
    searchHref.value = newSearchHref
  }
}

onMounted(updateSearchLink)
watch(() => route.path, updateSearchLink)

const currentNav = ref('')
</script>
