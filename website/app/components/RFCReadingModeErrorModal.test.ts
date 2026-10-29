// @vitest-environment nuxt
import { afterEach, describe, expect, test } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import RFCReadingModeErrorModal from './RFCReadingModeErrorModal.vue'
import { describeReadingError, type ReadingError } from '~/utilities/reading-mode/reading-error'

enableAutoUnmount(afterEach)

describe('RFCReadingModeErrorModal', () => {
  test.each<ReadingError>([
    { kind: 'no-voices' },
    { kind: 'unsupported' },
    { kind: 'blocked' },
    { kind: 'voice-failed' },
    { kind: 'unexpected', code: 'audio-busy' }
  ])('shows the $kind failure', async (error) => {
    await mountSuspended(RFCReadingModeErrorModal, { props: { error } })
    expect(document.body.textContent).toContain(describeReadingError(error).title)
  })

  test('shows platform advice only for a missing voice', async () => {
    await mountSuspended(RFCReadingModeErrorModal, { props: { error: { kind: 'no-voices' } } })
    expect(document.body.textContent).toContain('Once a voice is installed')
  })

  test('shows no platform advice for other failures', async () => {
    await mountSuspended(RFCReadingModeErrorModal, { props: { error: { kind: 'blocked' } } })
    expect(document.body.textContent).not.toContain('Once a voice is installed')
  })

  test('shows nothing without an error', async () => {
    await mountSuspended(RFCReadingModeErrorModal, { props: { error: undefined } })
    expect(document.body.textContent).not.toContain('Reading')
  })
})
