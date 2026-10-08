<template>
  <div class="pt-2 flex flex-col gap-5">
    <p v-if="surveysStore.status === 'idle' || surveysStore.status === 'pending'">Loading surveys…</p>
    <p v-else-if="surveysStore.status === 'error'">Unable to load surveys.</p>
    <p v-else-if="surveysStore.surveys.length === 0">No surveys have been published.</p>

    <Table v-else>
      <thead>
        <TableRow>
          <TableCellHeader background="solid">Title</TableCellHeader>
          <!-- <TableCellHeader background="solid">Audience</TableCellHeader> -->
          <TableCellHeader background="solid">Dismissed on this device?</TableCellHeader>
        </TableRow>
      </thead>
      <tbody>
        <TableRow v-for="survey in surveys" :key="survey.slug">
          <TableCell>
            <Anchor :href="survey.url"
              >{{ survey.title }}
              <GraphicsNewWindowIcon />
            </Anchor>
          </TableCell>
          <!-- <TableCell
            >{{ survey.visibility === 'authenticated' ? 'logged in only' : 'anonymous' }}
            {{ survey.documents?.join(', ') || '' }}</TableCell
          > -->
          <TableCell>{{ isDismissed(survey.slug) ? 'Yes' : 'No' }}</TableCell>
        </TableRow>
      </tbody>
    </Table>
  </div>
</template>

<script setup lang="ts">
import { useReefSurveysStore } from '~/stores/reef-surveys'
import { useNotificationsStore } from '~/stores/notifications'
import { withReturnTo } from '~/utilities/reef-surveys'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { SURVEY_PATH } from '~/utilities/url-constants'

const surveysStore = useReefSurveysStore()
const notificationsStore = useNotificationsStore()
const featureFlags = useFeatureFlags()

const isDismissed = (slug: string): boolean => notificationsStore.dismissedIds.includes(slug)

const route = useRoute()

const surveys = computed(() =>
  surveysStore.surveys.map((survey) => {
    let { url } = survey
    url = withReturnTo(url, route.fullPath)

    if (featureFlags.value.redSurveys) {
      const redSurveyUrl = new URL(url)
      redSurveyUrl.host = ''
      redSurveyUrl.pathname = SURVEY_PATH
      url = `${redSurveyUrl.pathname}${redSurveyUrl.search}`
    }

    return {
      ...survey,
      url
    }
  })
)

onMounted(() => {
  surveysStore.load().catch((error: unknown) => console.error('Unable to load surveys.', error))
})
</script>
