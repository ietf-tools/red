<template>
  <section aria-labelledby="account-subscriptions-heading">
    <Heading id="account-subscriptions-heading" level="2">Your subscriptions</Heading>

    <p
      v-if="subscriptionsLoadingStatus.type === 'loading'"
      class="flex items-center gap-2 py-3"
      aria-live="polite"
      aria-atomic="true">
      <GraphicsLoading class="inline-block w-5 h-5" />
      Loading...
    </p>

    <AlertBox v-else-if="subscriptionsLoadingStatus.type === 'error'" variant="warning" role="alert">
      <p>
        {{ subscriptionsLoadingStatus.message }}
        <button type="button" class="underline cursor-pointer" @click="loadSubscriptions">Try again</button>
      </p>
    </AlertBox>

    <template v-else-if="subscriptionsLoadingStatus.type === 'success'">
      <ul v-if="subscriptions.length > 0" class="flex flex-col gap-2 py-3">
        <li
          v-for="{ subscription, browsePath } in subscriptionRows"
          :key="subscription.id"
          class="bg-white dark:bg-black border border-gray-300 dark:border-gray-500 rounded px-3 py-2">
          <div class="flex items-start justify-between gap-2">
            <span>
              <AMaybeRFCLink v-if="browsePath" :href="browsePath" class="block px-2 py-1">
                <span class="block font-bold">{{ subscriptionLabel(subscription) }}</span>
                <span v-if="subscriptionParamsSummary(subscription)" class="block text-sm">
                  {{ subscriptionParamsSummary(subscription) }}
                </span>
              </AMaybeRFCLink>
              <span v-else class="block px-2 py-1">
                <span class="block font-bold">{{ subscriptionLabel(subscription) }}</span>
                <span v-if="subscriptionParamsSummary(subscription)" class="block text-sm">
                  {{ subscriptionParamsSummary(subscription) }}
                </span>
              </span>
              <span
                v-if="subscriptionDeleteErrors[subscription.id]"
                class="block px-2 text-sm text-red-700"
                role="alert">
                {{ subscriptionDeleteErrors[subscription.id] }}
              </span>
            </span>

            <span class="flex items-center gap-1 shrink-0">
              <DialogRoot
                :open="confirmDeleteId === subscription.id"
                @update:open="(open) => (confirmDeleteId = open ? subscription.id : undefined)">
                <DialogTrigger
                  :aria-label="`Delete subscription: ${subscriptionLabel(subscription)}`"
                  class="font-bold text-sm flex flex-row items-center gap-2 cursor-pointer px-2 py-1 rounded-md border-1 border-gray-400 hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800">
                  <GraphicsDismiss class="align-middle" />
                  Unsubscribe
                </DialogTrigger>
                <DialogPortal>
                  <DialogOverlay class="bg-black/10 backdrop-blur-xs fixed inset-0 z-110" />
                  <DialogContent
                    :class="[
                      'fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] z-115',
                      'focus:outline-none rounded-md shadow-3xl',
                      'bg-white dark:bg-gray-800',
                      'px-4 pt-3 pb-1'
                    ]">
                    <DialogTitle class="text-lg font-semibold text-center pb-3">Delete this subscription?</DialogTitle>

                    <DialogDescription class="text-sm">
                      <p>
                        {{ subscriptionLabel(subscription) }}
                        <template v-if="subscriptionParamsSummary(subscription)">
                          — {{ subscriptionParamsSummary(subscription) }}
                        </template>
                      </p>
                      <p class="pt-2">You'll stop receiving these notifications. This can't be undone.</p>

                      <!-- role="alert" so a failed delete is announced: the dialog stays put and the only
                           thing that changed is this line appearing. -->
                      <p
                        v-if="subscriptionDeleteErrors[subscription.id]"
                        role="alert"
                        class="pt-2 text-red-700 dark:text-red-400">
                        {{ subscriptionDeleteErrors[subscription.id] }}
                      </p>

                      <div class="flex justify-end gap-2 pt-4 pb-2">
                        <DialogClose
                          :class="[
                            'px-3 py-1 rounded-md',
                            'text-blue-800 dark:text-white font-bold border-1 border-blue-600 dark:border-blue-200',
                            'cursor-pointer'
                          ]">
                          Cancel
                        </DialogClose>
                        <button
                          type="button"
                          :disabled="subscriptionsDeleting[subscription.id]"
                          class="font-bold bg-red-700 text-white px-3 py-2 rounded cursor-pointer disabled:opacity-60 disabled:cursor-default"
                          @click="deleteSubscriptionRow(subscription)">
                          {{ subscriptionsDeleting[subscription.id] ? 'Deleting…' : 'Delete' }}
                        </button>
                      </div>
                    </DialogDescription>

                    <DialogClose class="absolute top-2 right-2 px-2 py-2 cursor-pointer" aria-label="Close">
                      <GraphicsClose />
                    </DialogClose>
                  </DialogContent>
                </DialogPortal>
              </DialogRoot>
            </span>
          </div>
        </li>
      </ul>
      <p v-else class="italic py-3">You have no subscriptions yet.</p>
    </template>
  </section>
</template>

<script setup lang="ts">
/**
 * The account page's list of notification subscriptions.
 *
 * Only rendered for a signed-in user — the caller is responsible for that check — and the
 * Reef API client is browser-only, so the load happens on mount rather than during SSR.
 */
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from 'reka-ui'
import { z } from 'zod'
import type { LoadingStatus } from '~/utilities/loading-status'
import {
  deleteSubscription,
  getSubscriptions,
  ReefError,
  type Subscription,
  type SubscriptionKind
} from '~/utilities/reef'
import { parseSeriesId } from '~/utilities/rfc'
import { infoSeriesPathBuilder, setPathBuilder, subjectsPathBuilder } from '~/utilities/url'

// Wording taken from the KindEnum descriptions in reef_api.yaml. Only this component reads
// subscriptions this way, so the label and summary presentation live here rather than as
// exports another file has to keep in step with.
const KIND_LABELS: Record<SubscriptionKind, string> = {
  rfc: 'A specific RFC',
  new_rfc: 'Any new RFC',
  by_status: 'New RFC by status',
  obsoleted: 'RFC obsoleted or made historic',
  subject: 'Changes to anything carrying a subject',
  set: 'Set of RFCs'
}

// `params` is typed as `unknown` in the spec, so it's parsed rather than trusted. The rfc kind's
// one param is the document it's for — read here once, since the label and the browse link both
// need it.
const SubscriptionParamsSchema = z.record(z.string(), z.unknown())

const rfcSubscriptionDoc = (subscription: Subscription): string | undefined => {
  if (subscription.kind !== 'rfc') {
    return undefined
  }
  const { data } = SubscriptionParamsSchema.safeParse(subscription.params)
  return typeof data?.rfc === 'string' ? data.rfc : undefined
}

// The tag name rather than the generic "Changes to anything carrying a subject" kind label, for
// the same reason as rfc below: `subject_details` is what Reef added to a subscription so a list
// can show and link the subject it names (see MinimalSubject in reef_api.yaml), and the name is
// the part worth showing. Empty when `kind` isn't `subject`, or when a subscription pointing at a
// deleted subject leaves the details blank.
const subjectSubscriptionName = (subscription: Subscription): string | undefined => {
  if (subscription.kind !== 'subject' || subscription.subject_details.name === '') {
    return undefined
  }
  return subscription.subject_details.name
}

// Names the document rather than the generic "A specific RFC" kind label, since the whole point
// of an rfc-kind subscription is which one. Same for a subject-kind subscription and its tag name.
// Falls back to the kind label — and, failing that, the raw kind — for anything this build can't
// parse a document or subject out of, so a subscription created by a newer Reef, or with params in
// a shape this build doesn't expect, still shows something rather than an empty row.
const subscriptionLabel = (subscription: Subscription): string => {
  const doc = rfcSubscriptionDoc(subscription)
  const rfc = doc !== undefined ? parseSeriesId(doc) : undefined
  if (rfc !== undefined) {
    return `${rfc.type.toUpperCase()} ${rfc.number}`
  }
  return subjectSubscriptionName(subscription) ?? KIND_LABELS[subscription.kind] ?? subscription.kind
}

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
  return JSON.stringify(value).toUpperCase() ?? ''
}

// Returns undefined when there's nothing worth showing, which is the common case for the new_rfc
// and set kinds — and now also for rfc, whose one param is the document subscriptionLabel already
// names.
const subscriptionParamsSummary = ({ params }: Subscription): string | undefined => {
  const { data } = SubscriptionParamsSchema.safeParse(params)
  if (data === undefined) {
    return undefined
  }

  const summary = Object.entries(data)
    .filter(([key, value]) => key !== 'rfc' && value !== null && value !== undefined && value !== '')
    .map(([, value]) => formatParamValue(value))
    .join(', ')

  return summary === '' ? undefined : summary
}

// Where "browse to that thing" goes, per kind. rfc carries its document under params.rfc, set
// carries its uuid on the subscription itself rather than in params, and subject carries its slug
// under subject_details — three places Reef puts an identifier depending on kind. The other kinds
// (new_rfc, by_status, obsoleted) name no single thing to browse to, so there's nothing to link.
const subscriptionBrowsePath = (subscription: Subscription): string | undefined => {
  const doc = rfcSubscriptionDoc(subscription)
  if (doc !== undefined) {
    try {
      return infoSeriesPathBuilder(doc)
    } catch {
      return undefined
    }
  }
  if (subscription.kind === 'set' && subscription.set) {
    return setPathBuilder(subscription.set)
  }
  if (subjectSubscriptionName(subscription) !== undefined) {
    return subjectsPathBuilder(subscription.subject_details.slug)
  }
  return undefined
}

const subscriptionsLoadingStatus = ref<LoadingStatus>({ type: 'idle' })
const subscriptions = ref<Subscription[]>([])

// Each row's browse-to link, computed once here rather than in the template: AMaybeRFCLink needs
// a definite string, and vue-tsc can't narrow that from a v-if guard and a binding that each call
// subscriptionBrowsePath separately.
const subscriptionRows = computed(() =>
  subscriptions.value.map((subscription) => ({ subscription, browsePath: subscriptionBrowsePath(subscription) }))
)

// One controller per attempt so that unmounting, or a retry click landing while the previous
// request is still open, abandons the older request instead of letting it set state later.
let subscriptionsController: AbortController | undefined

const loadSubscriptions = async () => {
  subscriptionsController?.abort()
  subscriptionsController = new AbortController()
  const { signal } = subscriptionsController

  subscriptionsLoadingStatus.value = { type: 'loading' }

  try {
    const loaded = await getSubscriptions(signal)
    // Newest first, so a subscription the user just created appears at the top of the list.
    subscriptions.value = loaded.toSorted((a, b) => b.created_at.localeCompare(a.created_at))
    subscriptionsLoadingStatus.value = { type: 'success' }
  } catch (error) {
    if (signal.aborted) {
      // superseded by a newer attempt, or the component has gone away
      return
    }
    console.error('Unable to load notification subscriptions.', error)
    subscriptionsLoadingStatus.value = {
      type: 'error',
      message:
        error instanceof ReefError && error.status === 403
          ? "You don't have permission to view these notifications."
          : 'Unable to load your notifications. See the web console for details.'
    }
  }
}

// Which row's delete confirmation dialog is open, if any. Only one can be open at a time — the
// dialog is modal — so a single id is enough to control every row's DialogRoot.
const confirmDeleteId = ref<number>()

// Keyed by subscription id, since more than one row's delete button can be pressed independently.
const subscriptionsDeleting = reactive<Record<number, boolean>>({})
const subscriptionDeleteErrors = reactive<Record<number, string>>({})

const deleteSubscriptionRow = async (subscription: Subscription) => {
  subscriptionsDeleting[subscription.id] = true
  delete subscriptionDeleteErrors[subscription.id]

  try {
    await deleteSubscription(subscription.id)
    subscriptions.value = subscriptions.value.filter(({ id }) => id !== subscription.id)
  } catch (error) {
    console.error('Unable to delete this subscription.', error)
    subscriptionDeleteErrors[subscription.id] = 'Unable to delete this subscription. Please try again.'
  } finally {
    delete subscriptionsDeleting[subscription.id]
  }
}

onMounted(() => {
  void loadSubscriptions()
})

onBeforeUnmount(() => {
  subscriptionsController?.abort()
})
</script>
