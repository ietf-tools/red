// @vitest-environment nuxt
import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import RFCDocumentBody from './RFCDocumentBody.vue'
import type { RfcBucketHtmlDocument } from '~/utilities/rfc'

const foldedBlock = [
  "========== NOTE: '\\' line wrapping per RFC 8792 ===========",
  '',
  'first folded line \\',
  'continues here',
  ''
].join('\n')

const rfcBucketHtmlDocument: RfcBucketHtmlDocument = {
  rfc: {
    number: 8792,
    title: 'Handling Long Lines in Content of Internet-Drafts and RFCs',
    status: { slug: 'inf', name: 'informational' },
    authors: [{ titlepage_name: 'K. Watsen' }],
    stream: { slug: 'IETF', name: 'IETF' },
    formats: [{ format: 'html' }]
  },
  tableOfContents: { title: 'Table of Contents', sections: [] },
  documentHtmlType: 'xml2rfc',
  documentHtmlObj: [
    {
      type: 'Element',
      nodeName: 'div',
      attributes: {
        class: 'sourcecode has-copy-unfolded',
        id: 'copy-unfolded-demo',
        'data-rfc8792-copy-unfolded': 'true'
      },
      children: [
        {
          type: 'Element',
          nodeName: 'pre',
          attributes: {},
          children: [{ type: 'Text', textContent: foldedBlock }]
        }
      ]
    }
  ],
  maxPreformattedLineLength: { max: 68 },
  timestampIso: '2026-06-04T00:00:00.000Z'
}

describe('RFCDocumentBody', () => {
  test('renders RFC 8792 source blocks with their content and copy control', () => {
    const wrapper = mount(RFCDocumentBody, {
      props: {
        rfcBucketHtmlDocument,
        gotoErrata: () => {},
        breadcrumbItems: [],
        changeTab: () => {},
        isModalOpen: false
      },
      global: {
        stubs: {
          Breadcrumbs: true,
          RFCDocumentMobileInfoButton: {
            template: '<button type="button"><slot /></button>'
          },
          Heading: {
            props: ['level'],
            template: '<component :is="`h${level}`"><slot /></component>'
          },
          RFCTitle: true,
          RFCTitleSubseries: true,
          RFCDocumentAuthor: true,
          RFCDocumentBodyPill: true,
          Alert: true,
          RFCMobileBanner: true
        }
      }
    })

    const sourcecode = wrapper.get('#copy-unfolded-demo')

    expect(sourcecode.get('pre').text()).toContain('first folded line \\')
    expect(sourcecode.get('button.copy-unfolded').text()).toBe(
      'Copy unfolded'
    )
  })
})
