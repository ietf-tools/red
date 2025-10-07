import type { Rfc } from '../../generated/red-client'
import { parseRFCId } from './rfc'
import type { RfcCommon } from './rfc'
import type { RFCJSON } from './rfc-validators'
import {
  parseRfcFormat,
  parseRfcJsonPubDateToISO,
  parseTypeSenseSubseries
} from './rfc-converters-utils'
import { parseRfcStatusSlug, parseRfcStreamSlug } from './rfc-converter-parse'
import { TypeSenseSearchItemSchema } from './typesense'
import type { TypeSenseSearchItem } from './typesense'

/**
 * Converts between types of RFC data
 * FIXME: this is losing details
 */
export const rfcJSONToRfcCommon = (rfcJson: RFCJSON): RfcCommon => {
  return {
    number: parseInt(parseRFCId(rfcJson.doc_id).number, 10),
    title: rfcJson.title,
    published: rfcJson.pub_date ? parseRfcJsonPubDateToISO(rfcJson.pub_date) : undefined,
    status: parseRfcStatusSlug(rfcJson.status),
    pages: rfcJson.page_count ? parseInt(rfcJson.page_count, 10) : undefined,
    authors: rfcJson.authors.map((authorName) => ({
      person: 0,
      name: authorName
    })),
    group: {
      acronym: rfcJson.source,
      name: rfcJson.source
    },
    area: {
      name: rfcJson.source,
      acronym: rfcJson.source
    },
    stream: {
      slug: parseRfcStreamSlug(rfcJson.source),
      name: rfcJson.source
    },
    identifiers:
      rfcJson.doi ?
        [
          {
            type: 'doi',
            value: rfcJson.doi
          }
        ]
      : [],
    obsoletes: rfcJson.obsoletes.map(
      (obsolete): NonNullable<Rfc['obsoletes']>[number] => {
        const rfcId = parseRFCId(obsolete)
        return {
          id: 0,
          number: parseInt(rfcId.number, 10),
          title: obsolete
        }
      }
    ),
    obsoleted_by: rfcJson.obsoleted_by.map(
      (obsoleted_by_item): NonNullable<Rfc['obsoleted_by']>[number] => {
        const rfcId = parseRFCId(obsoleted_by_item)
        return {
          id: 0,
          number: parseInt(rfcId.number, 10),
          title: obsoleted_by_item
        }
      }
    ),
    updates: rfcJson.updates.map(
      (update): NonNullable<Rfc['updates']>[number] => {
        const rfcId = parseRFCId(update)
        return {
          id: 0,
          number: parseInt(rfcId.number, 10),
          title: update
        }
      }
    ),
    updated_by: rfcJson.updated_by.map(
      (updated_by_item): NonNullable<Rfc['updated_by']>[number] => {
        const rfcId = parseRFCId(updated_by_item)
        return {
          id: 0,
          number: parseInt(rfcId.number, 10),
          title: updated_by_item
        }
      }
    ),
    is_also: undefined,
    see_also: rfcJson.see_also,
    draft: rfcJson.draft ? {
      id: 0,
      number: parseFloat(rfcJson.draft),
      title: rfcJson.draft,
      slug: rfcJson.draft
    } : undefined,
    abstract: rfcJson.abstract ?? undefined,
    formats: rfcJson.format.map(parseRfcFormat),
    keywords: rfcJson.keywords,
    errata: [],
    text: ''
  }
}

export const typeSenseSearchItemToRFCCommon = (
  unverifiedTypeSenseSearchItem: TypeSenseSearchItem
): RfcCommon => {
  const result = TypeSenseSearchItemSchema.safeParse(
    unverifiedTypeSenseSearchItem
  )
  if (result.error) {
    console.error(result.error.toString())
    throw Error(result.error.toString())
  }

  const item = result.data

  const published = new Date(item.publicationDate * 1000).toISOString()
  const authors =
    item.authors?.map((author, index) => ({
      person: index,
      name: author.name
    })) ?? []

  return {
    abstract: item.abstract,
    area:
      item.area ?
        {
          name: item.area.name,
          acronym: item.area.acronym
        }
      : undefined,
    authors,
    formats: [],
    group: {
      acronym: item.group.acronym,
      name: item.group.name
    },
    number: item.rfcNumber,
    published,
    subseries: item.status?.name ? parseTypeSenseSubseries(item) : undefined,
    status: parseRfcStatusSlug(item.status?.name),
    stream: {
      slug: parseRfcStreamSlug(item.stream?.slug),
      name: item.stream?.name || 'unknown'
    },
    text: '',
    title: item.title
  }
}
