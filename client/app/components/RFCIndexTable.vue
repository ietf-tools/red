<template>
  <Table>
    <thead>
      <tr>
        <th class="text-left p-1">
          <abbr title="Number" class="underline-none">Num</abbr>
        </th>
        <th class="text-left p-1">Information</th>
      </tr>
    </thead>
    <tbody>
      <TableRow v-if="props.isExample" key="example">
        <td>#####</td>
        <td>
          <p>
            Title of RFC Author list [ Month Year ] (Format) (Obsoletes xxxx)
            (Obsoleted-By xxxx) (Updates xxxx) (Updated-By xxxx) (Also zzz##)
            (Status: status) (Stream: stream) (DOI: doi) <br /><br />

            or ##### Not Issued.
          </p>
        </td>
      </TableRow>
      <TableRow
        v-for="rfcRow in rfcRows"
        v-else
        :key="rfcRow.number.toString()"
      >
        <td class="text-right align-top p-1">
          <A
            :href="infoRfcPathBuilder(`rfc${rfcRow.number}`)"
            class="font-mono"
          >
            {{ rfcRow.number }}
          </A>
        </td>
        <td class="p-1 align-top">
          <p>
            <Renderable :val="rfcRow.information" />
          </p>
        </td>
      </TableRow>
    </tbody>
  </Table>
</template>

<script setup lang="ts">
import { infoRfcPathBuilder } from '~/utilities/url'

type RfcRow = { number: number; information: VNode }

type Props = {
  rfcRows: RfcRow[]
  isExample?: boolean
}

const props = defineProps<Props>()
</script>
