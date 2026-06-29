<template>
  <Anchor
    :href="SEARCH_PATH"
    class="absolute top-0 right-10 no-underline block px-2 pt-4.25 pb-2 block lg:hidden"
    aria-label="Search">
    <Icon name="fluent:search-12-filled" />
  </Anchor>

  <DialogRoot v-model:open="isOpen">
    <DialogTrigger aria-label="Menu" type="button" class="absolute top-0 right-0 block px-3 py-4.5 block lg:hidden">
      <GraphicsHamburgerMenu />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay />
      <DialogContent
        :class="// needs overflow-y-scroll to force scrollbars, to ensure same page width as the main view
        'absolute inset-0 z-60 bg-blue-900 text-white dark:bg-blue-950 dark:text-white overflow-y-scroll h-full'">
        <DialogTitle>
          <div class="container mx-auto flex justify-between w-full pl-5 pr-3 py-4 items-center">
            <GraphicsHeaderLogoMobileMenu />
            <DialogClose>
              <GraphicsClose class="text-white" />
            </DialogClose>
          </div>
        </DialogTitle>
        <div class="container mx-auto flex flex-col pb-16" @keydown.capture="handleAccordionArrowNav">
          <Accordion>
            <template v-for="(item, index) in menuData" :key="index.toString()">
              <Anchor v-if="item.href" :href="item.href" :class="MENU_ITEM_CLASS" @click="isOpen = false">
                <GraphicsChevron
                  v-if="item.hideDropdownIconDesktop"
                  class="absolute right-0 mt-1 mr-4 size-4 -rotate-90 text-blue-100" />
                {{ item.label }}
              </Anchor>
              <AccordionItem v-else :id="index.toString()" :trigger-text="item.label">
                <ul class="ml-4">
                  <li v-for="(level0, childIndex) in item.children" :key="childIndex">
                    <Anchor v-if="level0.href" :href="level0.href" :class="MENU_ITEM_CLASS" @click="isOpen = false">
                      {{ level0.label }}
                    </Anchor>
                    <RadioGroupRoot
                      v-else-if="level0.role === 'radiogroup'"
                      :model-value="level0.radioGroupRef?.value"
                      :aria-labelledby="groupLabelDomId('mobile', index, childIndex)"
                      @keydown="(event: KeyboardEvent) => onRadioGroupNav(event, level0.radioGroupRef)"
                      @update:model-value="
                        (value) => {
                          if (level0.radioGroupRef) {
                            level0.radioGroupRef.value = String(value)
                          }
                        }
                      "
                      class="pr-2">
                      <span
                        :id="groupLabelDomId('mobile', index, childIndex)"
                        class="flex pl-8 pt-4 pb-1 items-center font-bold text-sm text-gray-200 dark:text-gray-100">
                        {{ level0.label }}
                      </span>
                      <RadioGroupItem
                        v-for="(level1, level1Index) in level0.children"
                        :key="level1Index"
                        :value="level1.fieldValue"
                        :data-field-value="level1.fieldValue"
                        :aria-label="level1.activeLabelFn?.()"
                        :class="[MENU_ITEM_CLASS, 'items-center']">
                        <span
                          class="inline-flex items-center pt-[4px] justify-center w-[24px] h-[24px] mr-2 border-1 rounded-full border-current">
                          <RadioGroupIndicator>
                            <Icon name="fluent:checkmark-12-filled" class="block w-[16px] h-[16px]" />
                          </RadioGroupIndicator>
                        </span>
                        {{ level1.label }}
                      </RadioGroupItem>
                    </RadioGroupRoot>
                    <CheckboxGroupRoot
                      v-else-if="level0.role === 'checkboxgroup'"
                      role="group"
                      :model-value="level0.checkboxGroupRef?.value"
                      :aria-labelledby="groupLabelDomId('mobile', index, childIndex)"
                      @keydown="stopGroupNavKeys"
                      @update:model-value="
                        (value) => {
                          if (level0.checkboxGroupRef) {
                            level0.checkboxGroupRef.value = value.map(String)
                          }
                        }
                      "
                      class="pr-2">
                      <span
                        :id="groupLabelDomId('mobile', index, childIndex)"
                        class="flex pl-8 pt-4 pb-1 items-center font-bold text-sm text-gray-200 dark:text-gray-100">
                        {{ level0.label }}
                      </span>
                      <CheckboxRoot
                        v-for="(level1, level1Index) in level0.children"
                        :key="level1Index"
                        :value="level1.fieldValue"
                        :class="[MENU_ITEM_CLASS, 'items-center']">
                        <span
                          class="inline-flex items-center pt-[4px] justify-center w-[24px] h-[24px] mr-2 border-1 rounded border-current">
                          <CheckboxIndicator>
                            <Icon name="fluent:checkmark-12-filled" class="block w-[16px] h-[16px]" />
                          </CheckboxIndicator>
                        </span>
                        {{ level1.label }}
                      </CheckboxRoot>
                    </CheckboxGroupRoot>
                    <button
                      v-else-if="level0.click"
                      type="button"
                      :aria-label="level0.activeLabelFn?.()"
                      :aria-pressed="level0.isActiveFn ? Boolean(level0.isActiveFn()) : undefined"
                      :class="[MENU_ITEM_CLASS, 'flex items-center']"
                      @click="
                        (e: MouseEvent) => {
                          level0.click?.(e)
                          isOpen = false
                        }
                      ">
                      <HeaderNavIcon :icon="level0.icon" />
                      <Icon
                        v-if="level0.isActiveFn?.()"
                        name="fluent:checkmark-12-filled"
                        class="inline-block w-[14px] h-[14px] mr-1" />
                      <span
                        v-if="
                          level0.isActiveFn && !level0.isActiveFn() // render blank space if isActiveFn()===false
                        "
                        class="inline-block w-[14px] h-[14px] mr-1" />
                      {{ level0.label }}
                    </button>
                    <span
                      v-else-if="!level0.children"
                      class="flex pl-8 pt-4 pb-1 items-center font-bold text-sm text-gray-200 dark:text-gray-100">
                      {{ level0.label }}
                    </span>
                    <Accordion v-else>
                      <AccordionItem :id="index.toString()" :key="index" :trigger-text="level0.label" :style-depth="2">
                        <ul class="ml-4">
                          <li v-for="(level1, level1Index) in level0.children" :key="level1Index">
                            <template v-if="level1.href">
                              <Anchor
                                v-if="!level1.noSpaLink"
                                :href="level1.href"
                                :class="MENU_ITEM_CLASS"
                                @click="isOpen = false">
                                {{ level1.label }}
                              </Anchor>
                              <a
                                v-else-if="level1.noSpaLink"
                                :href="level1.href"
                                :class="MENU_ITEM_CLASS"
                                @click="isOpen = false">
                                {{ level1.label }}
                              </a>
                            </template>
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
  DialogClose,
  RadioGroupRoot,
  RadioGroupItem,
  RadioGroupIndicator,
  CheckboxGroupRoot,
  CheckboxRoot,
  CheckboxIndicator
} from 'reka-ui'
import { useMenuData, groupLabelDomId } from './HeaderNavData'
import { SEARCH_PATH } from '~/utilities/url'

const menuData = useMenuData('mobile')

const MENU_ITEM_CLASS =
  'flex w-full text-left border no-underline border-gray-500 px-4 py-3.5 hover:bg-blue-400 focus:bg-blue-400'

// The radio/checkbox groups manage their own roving focus on these keys. The
// enclosing AccordionItem also listens for arrow keys and navigates across
// every `[data-reka-collection-item]` it can find — which recursively includes
// the nested radio/checkbox items — so without this an arrow press escapes the
// group. Stop only the roving-focus keys; other keys must still reach the
// Accordion/Dialog.
const ROVING_FOCUS_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']

const stopGroupNavKeys = (event: KeyboardEvent) => {
  if (ROVING_FOCUS_KEYS.includes(event.key)) {
    event.stopPropagation()
  }
}

// Radio groups additionally need selection to follow arrow focus (APG). Reka
// drives that from a window-level keydown listener, which the stopPropagation
// above suppresses, so we re-apply it: after Reka moves roving focus (next
// tick), sync the group's model to the now-focused radio via its data-value.
const onRadioGroupNav = (event: KeyboardEvent, radioGroupRef?: Ref<string>) => {
  if (!ROVING_FOCUS_KEYS.includes(event.key)) {
    return
  }
  event.stopPropagation()
  if (!radioGroupRef) {
    return
  }
  nextTick(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement && active.dataset.fieldValue) {
      radioGroupRef.value = active.dataset.fieldValue
    }
  })
}

// Reka's AccordionItem runs arrow navigation over every collection item under
// the accordion root — which recursively includes the nested radio/checkbox
// items — so Down from a header would dive into a settings group (and the radio
// would select on arrow-focus). Intercept Up/Down in the capture phase and do
// header-only navigation ourselves, but only when a header is focused; when
// focus is inside a group we let the event through to the group's own handlers.
const HEADER_SELECTOR = '[data-reka-collection-item][aria-expanded]'

const handleAccordionArrowNav = (event: KeyboardEvent) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
    return
  }
  const container = event.currentTarget
  const active = document.activeElement
  if (!(container instanceof HTMLElement) || !(active instanceof HTMLElement) || !active.matches(HEADER_SELECTOR)) {
    return
  }
  const headers = Array.from(container.querySelectorAll<HTMLElement>(HEADER_SELECTOR))
  const currentIndex = headers.indexOf(active)
  if (currentIndex === -1) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  const direction = event.key === 'ArrowDown' ? 1 : -1
  const nextHeader = headers[(currentIndex + direction + headers.length) % headers.length]
  nextHeader?.focus()
}

const isOpen = ref(false)
</script>
