// Presentation logic for a user's notification subscriptions, as listed on the account page.
//
// Reef models a subscription as a `kind` plus a free-form `params` object whose shape varies
// by kind, so turning that pair into something a person can read is feature logic and lives
// here rather than in the component or in the API client (~/utilities/reef).

import type { Subscription, SubscriptionKind } from '~/utilities/reef'

// Wording taken from the KindEnum descriptions in reef_api.yaml.
const KIND_LABELS: Record<SubscriptionKind, string> = {
  rfc: 'A specific RFC',
  new_rfc: 'Any new RFC',
  by_status: 'New RFC by status',
  obsoleted: 'RFC obsoleted or made historic',
  subject_tag: 'RFC with a subject tag',
  set: 'Set of RFCs'
}

// Falls back to the raw kind so a subscription created by a newer Reef than this build knows
// about still shows something rather than an empty row.
export const subscriptionLabel = ({ kind }: Subscription): string => KIND_LABELS[kind] ?? kind

const formatParamValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map(formatParamValue).join(', ')
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value) ?? ''
}

// `params` is typed as `unknown` in the spec, so narrow it before reading anything off it.
// Returns undefined when there's nothing worth showing, which is the common case for the
// new_rfc kind, and the caller then renders the label on its own.
export const subscriptionParamsSummary = ({ params }: Subscription): string | undefined => {
  if (params === null || typeof params !== 'object' || Array.isArray(params)) {
    return undefined
  }

  const summary = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${formatParamValue(value)}`)
    .join(', ')

  return summary === '' ? undefined : summary
}

// Newest first, so a subscription the user just created appears at the top of the list.
export const sortSubscriptions = (subscriptions: Subscription[]): Subscription[] =>
  subscriptions.toSorted((a, b) => b.created_at.localeCompare(a.created_at))
