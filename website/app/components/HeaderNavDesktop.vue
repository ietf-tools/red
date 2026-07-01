<template>
  <NavigationMenuRoot
    v-model="currentNav"
    class="relative w-full justify-end content-end hidden lg:block"
    disable-hover-trigger>
    <NavigationMenuList class="m-0 flex gap-2 w-full justify-end list-none rounded-md">
      <NavigationMenuItem v-for="(menuItem, index) in menuDataWithNoScripts" :key="index">
        <NavigationMenuLink
          v-if="menuItem.href && !menuItem.children"
          :id="`menu-link-${index}`"
          :href="menuItem.href"
          :aria-label="menuItem.label"
          class="cursor-pointer hover:bg-blue-850 hover:outline-1 group flex select-none items-center justify-between gap-[2px] rounded-md px-4 py-3 text-[15px] leading-none focus:shadow-[0_0_0_2px_white]"
          as-child
          @click="menuItem.click">
          <Anchor>
            <Icon v-if="menuItem.icon && typeof menuItem.icon === 'string'" :name="menuItem.icon" />
            <component v-else-if="menuItem.icon && typeof menuItem.icon === 'function'" :is="menuItem.icon()" />
          </Anchor>
        </NavigationMenuLink>

        <NavigationMenuTrigger
          v-if="!menuItem.href && menuItem.children"
          type="button"
          :disabled="!hasMounted"
          :class="[
            'hover:bg-blue-850 hover:outline-1 group flex select-none items-center justify-between gap-2 rounded-md px-4 py-3 text-base leading-none',
            {
              'cursor-pointer': hasMounted // only use cursor-pointer when mounted, so that non-JS browsers don't get a confusing inactive button that looks like it's clickable
            }
          ]"
          :aria-label="menuItem.label">
          <HeaderNavIcon :icon="menuItem.icon" />
          <span v-if="!menuItem.hideLabelDesktop">
            {{ menuItem.label }}
          </span>
          <GraphicsChevron
            :class="[
              'ml-1 top-[1px] text-white transition-transform duration-[150ms] ease-in group-data-[state=open]:-rotate-180',
              hasMounted ? 'visible' : 'invisible'
            ]" />
        </NavigationMenuTrigger>
        <NavigationMenuContent
          v-if="menuItem.children"
          class="data-[motion=from-start]:animate-enterFromLeft data-[motion=from-end]:animate-enterFromRight data-[motion=to-start]:animate-exitToLeft data-[motion=to-end]:animate-exitToRight absolute top-0 left-0 w-full min-w-3xs sm:w-auto py-1"
          :aria-labelledby="menuItem.hideLabelDesktop ? dropdownHeadingDomId('desktop', index) : undefined">
          <h2
            v-if="menuItem.hideLabelDesktop"
            :id="dropdownHeadingDomId('desktop', index)"
            class="text-gray-600 dark:text-white pt-1 pb-1 pl-3 text-sm font-bold pl-3">
            {{ menuItem.label }}
          </h2>
          <ul class="list-none">
            <li
              v-for="(level0, level0Index) in menuItem.children"
              :key="`${index}.${level0Index}`"
              class="flex flex-col">
              <RadioGroupRoot
                v-if="level0.role === 'radiogroup'"
                :model-value="level0.radioGroupRef?.value"
                :aria-labelledby="groupLabelDomId('desktop', index, level0Index)"
                @keydown="(event: KeyboardEvent) => onRadioGroupNav(event, level0.radioGroupRef)"
                @update:model-value="
                  (value) => {
                    if (level0.radioGroupRef) {
                      level0.radioGroupRef.value = String(value)
                    }
                  }
                "
                class="mr-2">
                <span
                  :id="groupLabelDomId('desktop', index, level0Index)"
                  class="flex mt-1 pl-3 pt-2 pb-1 border-t-1 border-t-gray-300 dark:border-t-gray-200 items-center font-bold text-sm text-gray-700 dark:text-gray-200">
                  <HeaderNavIcon :icon="level0.icon" />
                  {{ level0.label }}
                </span>

                <template v-for="(level1, level1Index) in level0.children" :key="level1Index">
                  <RadioGroupItem
                    :value="level1.fieldValue"
                    :data-field-value="level1.fieldValue"
                    :aria-label="level1.activeLabelFn?.()"
                    :aria-describedby="
                      level1.description ? descriptionDomId('desktop', index, level0Index, level1Index) : undefined
                    "
                    :class="[MENU_ITEM_CLASS, 'mb-[1px] w-full cursor-pointer']">
                    <span class="flex items-center">
                      <span
                        class="inline-flex items-center pt-[2px] justify-center w-[20px] h-[20px] mr-2 border-blue-500 border-1 rounded-full border-current/60">
                        <RadioGroupIndicator>
                          <Icon name="fluent:checkmark-12-filled" class="block w-[14px] h-[14px]" />
                        </RadioGroupIndicator>
                      </span>
                      {{ level1.label }}
                    </span>
                  </RadioGroupItem>
                  <p
                    v-if="level1.description"
                    :id="descriptionDomId('desktop', index, level0Index, level1Index)"
                    class="pl-10 pr-2 pb-2 text-sm text-gray-800 dark:text-gray-200">
                    {{ level1.description }}
                  </p>
                </template>
              </RadioGroupRoot>
              <CheckboxGroupRoot
                v-else-if="level0.role === 'checkboxgroup'"
                role="group"
                :model-value="level0.checkboxGroupRef?.value"
                :aria-labelledby="groupLabelDomId('desktop', index, level0Index)"
                @keydown="stopGroupNavKeys"
                @update:model-value="
                  (value) => {
                    if (level0.checkboxGroupRef) {
                      level0.checkboxGroupRef.value = value.map(String)
                    }
                  }
                "
                class="mr-2">
                <span
                  :id="groupLabelDomId('desktop', index, level0Index)"
                  class="flex mt-1 pl-3 pt-2 pb-1 border-t-1 border-t-gray-300 dark:border-t-gray-200 items-center font-bold text-sm text-gray-700 dark:text-gray-200">
                  <HeaderNavIcon :icon="level0.icon" />
                  {{ level0.label }}
                </span>

                <template v-for="(level1, level1Index) in level0.children" :key="level1Index">
                  <CheckboxRoot
                    :value="level1.fieldValue"
                    :aria-describedby="
                      level1.description ? descriptionDomId('desktop', index, level0Index, level1Index) : undefined
                    "
                    :class="[MENU_ITEM_CLASS, 'mb-[1px] w-full cursor-pointer']">
                    <span class="flex items-center">
                      <span
                        class="inline-flex items-center pt-[2px] justify-center w-[20px] h-[20px] mr-2 border-1 rounded border-current/60">
                        <CheckboxIndicator>
                          <Icon name="fluent:checkmark-12-filled" class="block w-[14px] h-[14px]" />
                        </CheckboxIndicator>
                      </span>
                      {{ level1.label }}
                    </span>
                  </CheckboxRoot>
                  <p
                    v-if="level1.description"
                    :id="descriptionDomId('desktop', index, level0Index, level1Index)"
                    class="pl-11 pr-2 pb-2 text-sm text-gray-800 dark:text-gray-200">
                    {{ level1.description }}
                  </p>
                </template>
              </CheckboxGroupRoot>
              <NavigationMenuSub v-else-if="level0.children" :default-value="level0.label">
                <NavigationMenuList>
                  <NavigationMenuItem :value="`${index}.${level0Index}`" class="mb-[1px] flex flex-col">
                    <NavigationMenuTrigger
                      type="button"
                      :id="`menu-link-${index}-${level0Index}`"
                      :class="MENU_ITEM_CLASS">
                      <span>
                        <HeaderNavIcon :icon="level0.icon" />
                        {{ level0.label }}
                      </span>
                      <GraphicsChevron
                        class="transition-transform text-white translate-y-[0.2em] duration-[150ms] ease-in group-data-[state=open]:-rotate-180" />
                    </NavigationMenuTrigger>
                    <NavigationMenuContent
                      class="mx-1 pb-1 rounded-b-md bg-gray-200 dark:bg-gray-700 inset-shadow-sm inset-shadow-gray-400 dark:inset-shadow-gray-900 z-101">
                      <ul class="list-none">
                        <li
                          v-for="(level1, level1Index) in level0.children"
                          :key="`${index}.${level0Index}.${level1Index}`"
                          class="flex flex-col">
                          <NavigationMenuLink
                            v-if="level1.href"
                            :id="`menu-link-${index}-${level0Index}-${level1Index}`"
                            :href="level1.href"
                            :class="[MENU_ITEM_CLASS, 'pl-5']"
                            as-child
                            @click="level1.click">
                            <Anchor v-if="!level1.noSpaLink">
                              <HeaderNavIcon :icon="level1.icon" />
                              {{ level1.label }}
                            </Anchor>
                            <a v-else>
                              <HeaderNavIcon :icon="level1.icon" />
                              {{ level1.label }}
                            </a>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenuSub>
              <NavigationMenuLink v-else as-child>
                <Anchor
                  v-if="level0.href"
                  :href="level0.href"
                  :class="[MENU_ITEM_CLASS, 'mb-[1px]']"
                  @click="level0.click">
                  <span>
                    <HeaderNavIcon :icon="level0.icon" />
                    {{ level0.label }}
                    <GraphicsNewWindowIcon v-if="!isInternalLink(level0.href)" class="text-lg absolute ml-1 -mt-1" />
                  </span>
                </Anchor>
                <button
                  v-else-if="level0.click"
                  :id="`menu-link-${index}-${level0Index}`"
                  type="button"
                  :class="[MENU_ITEM_CLASS, 'cursor-pointer']"
                  :aria-label="level0.activeLabelFn?.()"
                  @click="level0.click">
                  <span class="flex items-center">
                    <HeaderNavIcon :icon="level0.icon" />
                    <span
                      v-if="level0.isActiveFn"
                      :class="[
                        'inline-block mr-2',
                        {
                          'border-1 border-current': level0.role === 'checkbox',
                          'border-1 rounded-xl border-current': level0.role === 'radio'
                        }
                      ]">
                      <Icon
                        v-if="Boolean(level0.isActiveFn?.())"
                        name="fluent:checkmark-12-filled"
                        :class="['inline-block w-[14px] h-[14px]']" />
                      <span v-else class="inline-block w-[14px] h-[14px]" />
                    </span>
                    {{ level0.label }}
                  </span>
                </button>
                <span
                  v-else
                  class="flex mt-1 pl-3 pt-2 pb-1 border-t-1 border-t-gray-300 dark:border-t-gray-200 items-center font-bold text-sm text-gray-700 dark:text-gray-200">
                  <HeaderNavIcon :icon="level0.icon" />
                  {{ level0.label }}
                </span>
              </NavigationMenuLink>
            </li>
          </ul>
        </NavigationMenuContent>
        <div class="hidden lg:block text-sm" v-html="menuItem.noScriptHtml"></div>
      </NavigationMenuItem>
    </NavigationMenuList>
    <div class="perspective-[2000px] absolute top-full left-0 flex w-full z-110">
      <NavigationMenuViewport
        class="data-[state=open]:animate-scaleIn data-[state=closed]:animate-scaleOut relative h-(--reka-navigation-menu-viewport-height) w-full origin-[top_center] overflow-hidden rounded-md bg-white dark:bg-gray-800 transition-[width,_height] duration-300 translate-x-(--reka-navigation-menu-viewport-left) sm:w-(--reka-navigation-menu-viewport-width) border-1 border-gray-200 dark:border-gray-600 shadow-3xl dark:shadow-blue-950" />
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
  NavigationMenuViewport,
  RadioGroupRoot,
  RadioGroupItem,
  RadioGroupIndicator,
  CheckboxGroupRoot,
  CheckboxIndicator,
  CheckboxRoot
} from 'reka-ui'
import {
  useMenuData,
  renderNoScriptMenuItem,
  groupLabelDomId,
  descriptionDomId,
  dropdownHeadingDomId
} from './HeaderNavData'
import { isInternalLink } from '~/utilities/url'

const MENU_ITEM_CLASS =
  'group select-none flex justify-between rounded-md data-[state=open]:rounded-b-none mx-1 px-3 py-2 text-sm font-medium leading-none no-underline outline-none text-black dark:text-white hover:bg-blue-500 hover:text-white focus:bg-blue-500 focus:text-white'

const menuData = useMenuData('desktop')

// The radio/checkbox groups manage their own roving focus on these keys.
// NavigationMenuContent also runs arrow navigation over every tabbable item in
// the open panel (bubble-phase keydown), so without this the same press moves
// focus twice. Stop only the roving-focus keys — Tab/Escape must still reach
// NavigationMenu so it can move focus out of the panel and dismiss it.
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

// Vue can't render <noscript> elements except in `v-html`, so we need to generate
// a menu in basic menu in HTML on the server
const menuDataWithNoScripts = computed(() => {
  return menuData.value.map((menuItem) => {
    const linkChildren = menuItem.children?.filter((child) => child.href && !child.click)
    const noScriptHtml = `<noscript data-nosnippet>${
      linkChildren && linkChildren.length > 0
        ? `<ul class="flex flex-col gap-1 list-none bg-white text-black px-3 py-2 gap-2 border-1 border-black rounded">${linkChildren
            .map((menuItem) =>
              renderNoScriptMenuItem(menuItem, {
                renderListDisc: false
              })
            )
            .join('')}</ul>`
        : ''
    }</noscript>`

    return {
      ...menuItem,
      noScriptHtml
    }
  })
})

const hasMounted = ref(false)

onMounted(() => {
  hasMounted.value = true
})

onUnmounted(() => {
  hasMounted.value = false
})

const currentNav = ref('')
</script>
