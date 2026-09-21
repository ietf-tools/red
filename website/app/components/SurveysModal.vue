<template>
  <div class="pt-2 flex flex-col gap-5">
    <p v-if="surveysStore.status === 'idle' || surveysStore.status === 'pending'">Loading surveys…</p>
    <p v-else-if="surveysStore.status === 'error'">Unable to load surveys.</p>
    <p v-else-if="surveysStore.surveys.length === 0">No surveys have been published.</p>

    <Table v-else>
      <thead>
        <TableRow>
          <TableCellHeader background="solid">Title</TableCellHeader>
          <TableCellHeader background="solid">Audience</TableCellHeader>
          <TableCellHeader background="solid">Dismissed on this device?</TableCellHeader>
        </TableRow>
      </thead>
      <tbody>
        <TableRow v-for="survey in surveysStore.surveys" :key="survey.slug">
          <TableCell>
            <Anchor :href="survey.url"
              >{{ survey.title }}
              <GraphicsNewWindowIcon />
            </Anchor>
          </TableCell>
          <TableCell
            >{{ survey.visibility === 'authenticated' ? 'logged in only' : 'anonymous' }}
            {{ survey.documents?.join(', ') || '' }}</TableCell
          >
          <TableCell>{{ isDismissed(survey.slug) ? 'Yes' : 'No' }}</TableCell>
        </TableRow>
      </tbody>
    </Table>
  </div>
</template>

<script setup lang="ts">
import { useReefSurveysStore } from '~/stores/reef-surveys'
import { useNotificationsStore } from '~/stores/notifications'

const surveysStore = useReefSurveysStore()
const notificationsStore = useNotificationsStore()

const isDismissed = (slug: string): boolean => notificationsStore.dismissedIds.includes(slug)

onMounted(() => {
  surveysStore.load().catch((error: unknown) => console.error('Unable to load surveys.', error))
})
</script>
