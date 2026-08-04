// @vitest-environment nuxt
import { describe, test, expect } from 'vitest'

import { DEFAULT_FEATURE_FLAGS, calculateIfFeatureFlagsAreEnabled } from './feature-flags'

describe('calculateIfFeatureFlagsAreEnabled', () => {
  test(`default shouldn't be considered 'feature flag enabled', for the purposes of displaying feature flag toasts etc`, () => {
    expect(calculateIfFeatureFlagsAreEnabled(DEFAULT_FEATURE_FLAGS)).toBeFalsy()
  })
})
