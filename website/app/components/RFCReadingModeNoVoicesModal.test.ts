// @vitest-environment nuxt
import { afterEach, describe, expect, test } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import RFCReadingModeNoVoicesModal from './RFCReadingModeNoVoicesModal.vue'

enableAutoUnmount(afterEach)

describe('RFCReadingModeNoVoicesModal', () => {
  test('shows advice while open', async () => {
    await mountSuspended(RFCReadingModeNoVoicesModal, { props: { open: true } })
    expect(document.body.textContent).toContain('Reading aloud needs a speech voice')
    expect(document.body.textContent).toContain('Once a voice is installed')
  })

  test('shows nothing while closed', async () => {
    await mountSuspended(RFCReadingModeNoVoicesModal, { props: { open: false } })
    expect(document.body.textContent).not.toContain('Reading aloud needs a speech voice')
  })
})
