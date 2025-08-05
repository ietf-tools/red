import {
  IETF_PRIVACY_STATEMENT_URL,
  markdownPathBuilder,
  SEARCH_PATH,
  searchPathBuilder
} from '~/utilities/url'
import type { VueClick } from '~/utilities/vue'

/**
 * Although this type is recursive the UI only renders about 2 levels deep
 */
export type MenuItem = {
  icon?: string
  label: string
  hideLabelDesktop?: boolean
  hideDropdownIconDesktop?: boolean
  href?: string
  click?: VueClick
  isActiveFn?: () => boolean
  activeLabelFn?: () => string
  children?: MenuItem[]
}

export const colorPreferences = [
  { value: 'system', label: 'System default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

export const useMenuData = () => {
  const colorMode = useColorMode()

  const menuData = computed((): MenuItem[] => [
    {
      label: 'The RFC Series',
      children: [
        { label: 'What is an RFC?', href: markdownPathBuilder('/series/rfc/') },
        {
          label: 'How can I use RFCs?',
          href: markdownPathBuilder('/series/rfc-use/')
        },
        {
          label: 'Tips for reading RFCs',
          href: markdownPathBuilder('/series/rfc-tips/')
        },
        {
          label: 'Browse RFCs by Status:',
          children: [
            {
              label: 'Standards',
              href: searchPathBuilder({ status: ['Internet Standard'] })
            },
            {
              label: 'Best Current Practices (BCP)',
              href: searchPathBuilder({ status: ['Best Current Practice'] })
            },
            {
              label: 'Informational',
              href: searchPathBuilder({ status: ['Informational'] })
            },
            {
              label: 'Experimental',
              href: searchPathBuilder({ status: ['Experimental'] })
            },
            {
              label: 'Historic',
              href: searchPathBuilder({ status: ['Historic'] })
            },
            {
              label: 'Unknown',
              href: searchPathBuilder({ status: ['Unknown'] })
            }
          ]
        },
        {
          label: 'Download RFCs',
          href: markdownPathBuilder('/series/rfc-download/')
        },
        {
          label: 'Errata in RFCs',
          href: markdownPathBuilder('/series/rfc-errata/')
        },
        {
          label: 'FAQ',
          href: markdownPathBuilder('/series/rfc-faq/')
        }
      ]
    },
    {
      label: 'For Authors',
      children: [
        {
          label: 'How to write an RFC',
          href: markdownPathBuilder('/authors/rfc-how-to/')
        },
        {
          label: 'Independent Submissions',
          href: markdownPathBuilder('/authors/rfc-independent-submissions/')
        },
        {
          label: 'RFC Editorial Process',
          href: markdownPathBuilder('/authors/rfc-edit/'),
          children: [
            {
              label: 'Current Publication Queue',
              href: markdownPathBuilder('/authors/rfc-edit/pub-queue/')
            },
            {
              label: 'Document Clusters in Queue',
              href: markdownPathBuilder('/authors/rfc-edit/doc-clusters/')
            },
            {
              label: 'Authors Final Review (AUTH48)',
              href: markdownPathBuilder('/authors/rfc-edit/auth48/')
            }
          ]
        },
        {
          label: 'Style Guide',
          href: markdownPathBuilder('/authors/rfc-style-guide/')
        }
      ]
    },
    {
      label: 'About Us',
      children: [
        {
          label: 'About RFC Editor',
          href: markdownPathBuilder('/about/rfc-editor/')
        },
        {
          label: 'Reports',
          href: markdownPathBuilder('/about/rpc-reports/')
        },
        {
          label: 'Privacy Statement',
          href: IETF_PRIVACY_STATEMENT_URL
        },
        {
          label: 'Contact',
          href: markdownPathBuilder('/about/contact/')
        }
      ]
    },
    {
      icon: 'fluent:search-12-filled',
      label: 'Search',
      href: SEARCH_PATH
    },
    {
      icon: 'fluent:dark-theme-20-filled',
      label: 'Theme',
      hideLabelDesktop: true,
      hideDropdownIconDesktop: true,
      children: colorPreferences.map((colorPreference) => ({
        label: `${colorPreference.label}`,
        activeLabelFn: () =>
          colorMode.preference === colorPreference.value ?
            `Selected ${colorPreference.label}`
          : `Not selected ${colorPreference.label}`,
        isActiveFn: () => colorMode.preference === colorPreference.value,
        click: () => {
          colorMode.preference = colorPreference.value
        }
      }))
    }
  ])

  return menuData
}
