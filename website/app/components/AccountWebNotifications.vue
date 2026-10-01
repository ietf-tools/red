<template>
  <section aria-labelledby="account-web-notifications-heading">
    <Heading id="account-web-notifications-heading" level="2">
      Your Subscription notifications ({{ unreadCount }} unread)
    </Heading>

    <p
      v-if="webNotifications.status === 'pending' && webNotifications.notifications.length === 0"
      class="flex items-center gap-2 py-3"
      aria-live="polite"
      aria-atomic="true">
      <GraphicsLoading class="inline-block w-5 h-5" />
      Loading...
    </p>

    <AlertBox v-else-if="webNotifications.status === 'error'" variant="warning" role="alert">
      <p>
        Unable to load your notifications. See the web console for details.
        <button type="button" class="underline cursor-pointer" @click="webNotifications.load">Try again</button>
      </p>
    </AlertBox>

    <template v-else>
      <button
        v-if="unreadCount > 0"
        type="button"
        :class="[
          'mt-4 ml-4 cursor-pointer',
          'py-1 px-3',
          'font-bold rounded text-xs tracking-wider text-blue-500 dark:text-blue-100',
          'border-2 border-blue-500 dark:border-blue-200',
          ' bg-white hover:bg-blue-400 focus:bg-blue-400 focus:text-white hover:text-white dark:bg-blue-950'
        ]"
        @click="webNotifications.markAllRead">
        Mark all as read
      </button>
      <ul v-if="notificationRows.length > 0" class="flex flex-col py-3 rounded-xl border-gray-200">
        <li
          v-for="{ notification, href, content } in notificationRows"
          :key="notification.id"
          :class="[
            'py-4 px-4 flex flex-row justify-between border border-b-1 border-gray-200 dark:border-gray-600',
            notification.read ? 'bg-transparent' : 'bg-white dark:bg-gray-800'
          ]">
          <div class="flex flex-row">
            <div>
              <span
                :class="[
                  'inline-block w-20 text-xs font-bold uppercase tracking-wider text-center py-1 px-3 rounded-xl border-1',
                  {
                    'border-gray-400 dark:border-gray-500 bg-blue-400 text-gray-200 dark:bg-blue-950 dark:text-white':
                      !notification.read,
                    'border-gray-400 dark:border-gray-500 bg-transparent text-gray-800 dark:bg-transaprent dark:text-white':
                      notification.read
                  }
                ]"
                >{{ notification.read ? 'read' : 'unread' }}</span
              >
            </div>
            <Anchor
              v-if="href"
              :href="href"
              class="no-underline inline-block px-3"
              @click="webNotifications.markRead(notification.id)">
              <span class="underline">
                <Renderable :val="content" />
              </span>
            </Anchor>
            <div v-else class="px-3">
              <Renderable :val="content" />
            </div>
          </div>
          <div class="pt-1 pr-1">
            <time
              :datetime="notification.created_at"
              class="block font-bold tracking-wider bg-gray-300 dark:bg-gray-600 rounded-xl px-3 py-1 text-xs whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
              {{ formatNotificationDate(notification.created_at) }}
            </time>
          </div>
        </li>
      </ul>
      <p v-else class="italic py-3">You have no notifications yet.</p>

      <button
        v-if="webNotifications.hasMore"
        type="button"
        class="underline cursor-pointer py-1"
        :disabled="webNotifications.status === 'pending'"
        @click="webNotifications.loadMore">
        {{ webNotifications.status === 'pending' ? 'Loading…' : 'Load more' }}
      </button>
    </template>
  </section>
</template>

<script setup lang="ts">
/**
 * The account page's list of this reader's own web notifications, fed by
 * ~/stores/reef-notifications.
 *
 * Only rendered for a signed-in user — the caller is responsible for that check — and the
 * store itself only loads once one is signed in.
 */
import { DateTime } from 'luxon'
import { z } from 'zod'
import { RFCTitle } from '#components'
import { filterNotificationsByUnread, useReefNotificationsStore } from '~/stores/reef-notifications'
import { parseSeriesId } from '~/utilities/rfc'
import type { SubscriptionKind, WebNotification } from '~/utilities/reef'
import { infoSeriesPathBuilder, usePublicSiteUrlOrigin } from '~/utilities/url'

const webNotifications = useReefNotificationsStore()
const publicSiteUrlOrigin = usePublicSiteUrlOrigin()

// `event` is typed as `unknown` in the spec, so it's parsed rather than trusted. Reef documents
// it as always carrying `doc` (the RFC the notification is about) and `url` (where to send the
// reader), which is everything a display needs to render and link — see WebNotification in
// reef_api.yaml. `change` is a further, undocumented field Reef sends naming what happened to
// `doc` in reader-facing wording (eg "Published", "Obsoleted") — read defensively like the rest,
// since nothing here can rely on the spec for its shape.
const NotificationEventSchema = z.record(z.string(), z.unknown())

const notificationEventString = (notification: WebNotification, key: 'doc' | 'url' | 'change'): string | undefined => {
  const { data } = NotificationEventSchema.safeParse(notification.event)
  const value = data?.[key]
  return typeof value === 'string' ? value : undefined
}

// Fallback wording for `change`, for a notification whose event carries none — kept short, in the
// same style as Reef's own values, rather than the fuller sentences AccountSubscriptions.vue's
// KIND_LABELS use for a subscription row.
const KIND_CHANGE: Record<SubscriptionKind, string> = {
  new_rfc: 'Published',
  by_status: 'Published',
  obsoleted: 'Obsoleted',
  rfc: 'Updated',
  set: 'Added to a Set you follow',
  subject: 'Added to a subject you follow'
}

const isKnownKind = (kind: string): kind is SubscriptionKind => kind in KIND_CHANGE

const notificationChange = (notification: WebNotification): string | undefined => {
  const change = notificationEventString(notification, 'change')
  if (change !== undefined) {
    return change
  }
  const { kind } = notification
  return isKnownKind(kind) ? KIND_CHANGE[kind] : undefined
}

// The notification's title: the change (if any) followed by the RFC it's about, rendered with
// RFCTitle so it matches every other RFC reference on the site — title text is hidden since the
// event carries nothing to fill it with, so only the "RFC 1234" chip shows. Falls back to plain
// text — the change alone, or failing that the raw kind — for a notification this build can't
// parse an RFC out of, so it still shows something rather than an empty row.
const notificationContent = (notification: WebNotification): VNode => {
  const doc = notificationEventString(notification, 'doc')
  const rfc = doc !== undefined ? parseSeriesId(doc) : undefined
  const change = notificationChange(notification)

  if (rfc === undefined) {
    return h('span', change ?? notification.kind)
  }

  return h('span', [
    change ? `${change} ` : undefined,
    h(RFCTitle, { rfc: { number: rfc.number, title: '' }, hideTitle: true })
  ])
}

// Reef's own url is used as-is when present. Falling back to building one from `doc` covers a
// notification whose event this build can't fully parse.
const notificationHref = (notification: WebNotification): string | undefined => {
  const url = notificationEventString(notification, 'url')
  if (url !== undefined) {
    return url
  }
  const doc = notificationEventString(notification, 'doc')
  if (doc === undefined) {
    return undefined
  }
  try {
    return infoSeriesPathBuilder(doc)
  } catch {
    return undefined
  }
}

const formatNotificationDate = (createdAt: string): string => {
  const dateTime = DateTime.fromISO(createdAt)

  return (
    dateTime.toRelativeCalendar({
      // by default would be localised in user language, but we should force English because the website's
      // language is English, and switching to a localised language for just this one part would be odd
      // (and remember this generates words, so would require lang attributes for those, so let's avoid that
      locale: 'en'
    }) ?? createdAt
  )
}

// Each row's link and content, computed once here rather than in the template: AMaybeRFCLink needs
// a definite string, and vue-tsc can't narrow that from a v-if guard and a binding that each call
// notificationHref separately.
const notificationRows = computed(() =>
  webNotifications.notifications.map((notification) => {
    const content = notificationContent(notification)

    let href = notificationHref(notification)
    if (href && href.startsWith(publicSiteUrlOrigin)) {
      href = href.substring(publicSiteUrlOrigin.length)
    }

    return {
      notification,
      href,
      content
    }
  })
)

const unreadCount = computed(() => filterNotificationsByUnread(webNotifications.notifications).length)
</script>
