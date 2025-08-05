<template>
  <DialogRoot v-model:open="isOpen">
    <DialogTrigger
      aria-label="Menu"
      class="absolute top-0 right-0 block p-4 block lg:hidden"
    >
      <GraphicsHamburgerMenu />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay />
      <DialogContent
        :class="// needs overflow-y-scroll to force scrollbars, to ensure same page width as the main view
        'absolute inset-0 z-50 bg-blue-900 text-white dark:bg-blue-950 dark:text-white overflow-y-scroll h-full'"
      >
        <DialogTitle>
          <button
            type="button"
            class="flex justify-between w-full py-5 px-4 items-center"
          >
            <GraphicsHeaderLogoMobileMenu />
            <DialogClose>
              <GraphicsClose class="text-white" />
            </DialogClose>
          </button>
        </DialogTitle>
        <div class="flex flex-col">
          <Accordion>
            <template v-for="(item, index) in menuData" :key="index.toString()">
              <A v-if="item.href" :href="item.href" :class="MENU_ITEM_CLASS">
                <GraphicsChevron
                  v-if="item.hideDropdownIconDesktop"
                  class="absolute right-0 mt-1 mr-4 size-4 -rotate-90 text-blue-100"
                />
                {{ item.label }}
              </A>
              <AccordionItem
                v-else
                :id="index.toString()"
                :trigger-text="item.label"
              >
                <ul class="ml-4">
                  <li
                    v-for="(level0, childIndex) in item.children"
                    :key="childIndex"
                  >
                    <A
                      v-if="level0.href"
                      :href="level0.href"
                      :class="MENU_ITEM_CLASS"
                    >
                      {{ level0.label }}
                    </A>
                    <button
                      v-else-if="level0.click"
                      type="button"
                      :aria-label="level0.activeLabelFn?.()"
                      :class="[MENU_ITEM_CLASS, 'flex items-center']"
                      @click="
                        (e: MouseEvent) => {
                          level0.click?.(e)
                          isOpen = false
                        }
                      "
                    >
                      <Icon v-if="level0.icon" :name="level0.icon" />
                      <Icon
                        v-if="level0.isActiveFn?.()"
                        name="fluent:checkmark-12-filled"
                        class="inline-block w-[14px] h-[14px] mr-1"
                      />
                      <span
                        v-if="
                          level0.isActiveFn && !level0.isActiveFn() // render blank space if isActiveFn()===false
                        "
                        class="inline-block w-[14px] h-[14px] mr-1"
                      />
                      {{ level0.label }}
                    </button>
                    <Accordion v-else>
                      <AccordionItem
                        :id="index.toString()"
                        :key="index"
                        :trigger-text="level0.label"
                        :style-depth="2"
                      >
                        <ul class="ml-4">
                          <li
                            v-for="(level1, level1Index) in level0.children"
                            :key="level1Index"
                          >
                            <A
                              v-if="level1.href"
                              :href="level1.href"
                              :class="MENU_ITEM_CLASS"
                            >
                              {{ level1.label }}
                            </A>
                          </li>
                        </ul>
                      </AccordionItem>
                    </Accordion>
                  </li>
                </ul>
              </AccordionItem>
            </template>
          </Accordion>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from 'reka-ui'
import { useMenuData } from './HeaderNavData'

const menuData = useMenuData()

const MENU_ITEM_CLASS =
  'flex w-full text-left border no-underline border-gray-500 px-4 py-3 hover:bg-blue-400 focus:bg-blue-400'

const isOpen = ref(false)
</script>
