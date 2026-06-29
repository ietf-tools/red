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
        :class="[
          'overflow-y-scroll', // needs overflow-y-scroll to force scrollbars, to ensure same page width as the main view
          'absolute inset-0 z-60 bg-blue-900 text-white dark:bg-blue-950 dark:text-white  h-full'
        ]"
        :aria-labelledby="headingId">
        <DialogClose aria-label="Close menu" class="absolute right-0 top-0 px-5 py-5">
          <GraphicsClose class="text-white" />
        </DialogClose>
        <div class="container mx-auto flex justify-between w-full pl-5 pr-3 py-4 items-center" aria-hidden>
          <GraphicsHeaderLogoMobileMenu />
        </div>
        <DialogTitle as="h1" :id="headingId" class="sr-only">Menu</DialogTitle>
        <nav
          aria-label="Mobile menu"
          class="container mx-auto flex flex-col pb-16"
          @keydown.capture="handleAccordionArrowNav">
          <h2 class="sr-only">Mobile menu</h2>
          <AccordionRoot type="single" :collapsible="true" as="ul">
            <li v-for="(item, index) in menuData" :key="index.toString()">
              <Anchor v-if="item.href" :href="item.href" :class="MENU_ITEM_CLASS" @click="isOpen = false">
                <GraphicsChevron
                  v-if="item.hideDropdownIconDesktop"
                  class="absolute right-0 mt-1 mr-4 size-4 -rotate-90 text-blue-100" />
                {{ item.label }}
              </Anchor>
              <HeaderNavMobileAccordionItem v-else :id="index.toString()" :trigger-text="item.label">
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
                      <template v-for="(level1, level1Index) in level0.children" :key="level1Index">
                        <RadioGroupItem
                          :value="level1.fieldValue"
                          :data-field-value="level1.fieldValue"
                          :aria-label="level1.activeLabelFn?.()"
                          :aria-describedby="
                            level1.description ? descriptionDomId('mobile', index, childIndex, level1Index) : undefined
                          "
                          :class="[MENU_ITEM_CLASS, 'items-center']">
                          <span
                            class="inline-flex items-center pt-[4px] justify-center w-[24px] h-[24px] mr-2 border-1 rounded-full border-current">
                            <RadioGroupIndicator>
                              <Icon name="fluent:checkmark-12-filled" class="block w-[16px] h-[16px]" />
                            </RadioGroupIndicator>
                          </span>
                          {{ level1.label }}
                        </RadioGroupItem>
                        <p
                          v-if="level1.description"
                          :id="descriptionDomId('mobile', index, childIndex, level1Index)"
                          class="pl-8 pr-4 pt-1 pb-3 text-sm text-gray-200 dark:text-gray-100">
                          {{ level1.description }}
                        </p>
                      </template>
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
                      <div
                        v-for="(level1, level1Index) in level0.children"
                        :key="level1Index"
                        :class="[MENU_ITEM_CLASS, 'flex-col', 'items-start']">
                        <CheckboxRoot
                          :value="level1.fieldValue"
                          :aria-describedby="
                            level1.description ? descriptionDomId('mobile', index, childIndex, level1Index) : undefined
                          "
                          class="flex items-center">
                          <span
                            class="inline-flex items-center pt-[4px] justify-center w-[24px] h-[24px] mr-2 border-1 rounded border-current">
                            <CheckboxIndicator>
                              <Icon name="fluent:checkmark-12-filled" class="block w-[16px] h-[16px]" />
                            </CheckboxIndicator>
                          </span>
                          {{ level1.label }}
                        </CheckboxRoot>
                        <p
                          v-if="level1.description"
                          :id="descriptionDomId('mobile', index, childIndex, level1Index)"
                          class="pl-8 pr-2 pt-1 pb-1 text-sm text-gray-200 dark:text-gray-100">
                          {{ level1.description }}
                        </p>
                      </div>
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
                    <AccordionRoot v-else type="single" :collapsible="true">
                      <HeaderNavMobileAccordionItem
                        :id="index.toString()"
                        :key="index"
                        :trigger-text="level0.label"
                        :style-depth="2">
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
                      </HeaderNavMobileAccordionItem>
                    </AccordionRoot>
                  </li>
                </ul>
              </HeaderNavMobileAccordionItem>
            </li>
          </AccordionRoot>
        </nav>
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
  CheckboxIndicator,
  AccordionRoot
} from 'reka-ui'
import { useMenuData, groupLabelDomId, descriptionDomId } from './HeaderNavData'
import { SEARCH_PATH } from '~/utilities/url'

const menuData = useMenuData('mobile')

const MENU_ITEM_CLASS =
  'flex w-full text-left border no-underline border-gray-500 px-4 py-3.5 hover:bg-blue-400 focus:bg-blue-400'

const headingId = useId()

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
// would select on arrow-focus). Intercept Up/Down in the capture phase and drive
// the navigation ourselves, scoped to a single menu level: the user tabs *into*
// an expanded submenu, then arrows cycle between that submenu's siblings without
// escaping the level. Each menu <li> exposes one primary control — an accordion
// header (`[aria-expanded]`) or a link, e.g. "Search" — so we navigate between the
// primary controls of the focused item's sibling <li>s. Radio/checkbox group
// items resolve to no such control, so focus inside a settings group falls through
// to the group's own roving-focus handlers.
const MENU_CONTROL_SELECTOR = 'a, [data-reka-collection-item][aria-expanded]'

const handleAccordionArrowNav = (event: KeyboardEvent) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
    return
  }
  const container = event.currentTarget
  const active = document.activeElement
  if (!(container instanceof HTMLElement) || !(active instanceof HTMLElement)) {
    return
  }
  // The menu level is the <ul> owning the focused item's <li>; navigate between
  // the primary control of each sibling <li> in that list.
  const list = active.closest('li')?.parentElement
  if (!list || !container.contains(list)) {
    return
  }
  const controls = Array.from(list.children)
    .map((li) => li.querySelector<HTMLElement>(MENU_CONTROL_SELECTOR))
    .filter((el): el is HTMLElement => el !== null)
  const currentIndex = controls.indexOf(active)
  if (currentIndex === -1) {
    // Focus is inside a settings group — let the group handle the arrow keys.
    return
  }
  event.preventDefault()
  event.stopPropagation()
  const direction = event.key === 'ArrowDown' ? 1 : -1
  const nextControl = controls[(currentIndex + direction + controls.length) % controls.length]
  nextControl?.focus()
}

const isOpen = ref(false)
</script>
