<template>
  <section aria-labelledby="account-web-notifications-heading">
    <Heading id="account-web-notifications-heading" level="2"
      >Your subscription notifications ({{ unreadCount }} unread)</Heading
    >

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
      <ul v-if="notificationRows.length > 0" class="flex flex-col gap-2 py-3">
        <li
          v-for="{ notification, href, content } in notificationRows"
          :key="notification.id"
          :class="[
            'border rounded',
            notification.read
              ? 'bg-transparent border-gray-500 dark:border-gray-300'
              : 'bg-white dark:bg-blue-950 border-gray-300 dark:border-gray-500'
          ]">
          <template v-if="href">
            <Anchor
              :href="href"
              class="no-underline inline-block px-3 py-2"
              @click="webNotifications.markRead(notification.id)">
              <span class="underline">
                <Renderable :val="content" />
              </span>
              <span class="sr-only ml-4 no-underline">{{ notification.read ? '(read)' : '(unread)' }}</span>
            </Anchor>
            <p class="block text-sm px-3 pb-2 text-gray-600 dark:text-gray-400">
              {{ formatNotificationDate(notification.created_at) }}
            </p>
          </template>
          <span v-else class="flex flex-col gap-0.5 px-3 py-2">
            <span class="block">
              <Renderable :val="content" />
              <span class="sr-only">{{ notification.read ? '(read)' : '(unread)' }}</span>
            </span>
            <span class="block text-sm text-gray-600 dark:text-gray-400">
              {{ formatNotificationDate(notification.created_at) }}
            </span>
          </span>
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
  set: 'Added to a set you follow',
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

const formatNotificationDate = (createdAt: string): string => DateTime.fromISO(createdAt).toFormat('d LLLL yyyy, HH:mm')

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
