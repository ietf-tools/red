<template>
  <NavModal
    v-for="modalMenuItem in modalMenuItems"
    :key="modalMenuItem.label"
    v-model:open="modalMenuItem.modalOpenRef.value"
    :modal-title="modalMenuItem.modalTitle">
    <template v-if="modalMenuItem.modalBody" #modalBody>
      <component :is="modalMenuItem.modalBody()" />
    </template>
  </NavModal>
</template>

<script setup lang="ts">
import { collectModalMenuItems, useMenuData } from './HeaderNavData'

// The dialogs of `modal-button` menu items are rendered here, as a sibling of the
// navs rather than inside the menu item that opens them: both navs unmount their
// contents when they close (and opening a dialog closes them, because focus moves
// out), which would take the dialog down with it.
//
// Rendering them once, here, also keeps a single dialog instance for the desktop
// and mobile navs, which both write to the same `modalOpenRef`. The mode passed to
// `useMenuData` only affects the top-level hideDesktop/hideMobile filtering, which
// no modal item is subject to.
const menuData = useMenuData('desktop')

const modalMenuItems = computed(() => collectModalMenuItems(menuData.value))
</script>
