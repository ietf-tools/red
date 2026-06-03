import { htmlEscapeToText } from '~/utilities/html'
import {
  IETF_PRIVACY_STATEMENT_URL,
  INTERNET_DRAFT_AUTHOR_RESOURCES_RFC_PUBLICATION_PROCESS_URL,
  markdownPathBuilder,
  SEARCH_PATH,
  useQueueUrlOrigin,
  type ValidHrefs
} from '~/utilities/url'
import type { VueClick } from '~/utilities/vue'

/**
 * Although this type is recursive the UI only renders about 2 levels deep
 */
export type MenuItem = {
  icon?: string
  label: string
  hideMobile?: boolean
  hideDesktop?: boolean
  hideLabelDesktop?: boolean
  hideDropdownIconDesktop?: boolean
  noSpaLink?: boolean
  href?: string
  click?: VueClick
  /**
   * A function that returns whether the menu item is active
   * Used for the theme picker
   */
  isActiveFn?: () => boolean
  activeLabelFn?: () => string
  children?: MenuItem[]
}

export const colorPreferences = [
  { value: 'system', label: 'System default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

type Mode = 'desktop' | 'mobile'

export const useMenuData = (mode: Mode) => {
  const colorMode = useColorMode()
  const queueUrlOrigin = useQueueUrlOrigin()

  const menuData = computed(() => {
    const data: MenuItem[] = [
      {
        label: 'The RFC Series',
        children: [
          {
            label: 'What is an RFC?',
            href: markdownPathBuilder('/series/rfc/')
          },
          {
            label: 'How can I use RFCs?',
            href: markdownPathBuilder('/series/rfc-use/')
          },
          {
            label: 'Tips for reading RFCs',
            href: markdownPathBuilder('/series/rfc-tips/')
          },
          {
            label: 'Browse all RFCs',
            href: '/rfc-index/' satisfies ValidHrefs,
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
            label: 'Style Guide',
            href: markdownPathBuilder('/authors/rfc-style-guide/')
          },
          {
            label: 'RFC Publication Process',
            href: INTERNET_DRAFT_AUTHOR_RESOURCES_RFC_PUBLICATION_PROCESS_URL satisfies ValidHrefs,
          },
          {
            label: 'Document Queue',
            href: queueUrlOrigin satisfies ValidHrefs
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
            href: IETF_PRIVACY_STATEMENT_URL satisfies ValidHrefs
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
        href: SEARCH_PATH satisfies ValidHrefs,
        hideMobile: true
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
    ]

    return data.filter((item) => {
      if (mode === 'desktop' && item.hideDesktop) {
        return false
      }
      if (mode === 'mobile' && item.hideMobile) {
        return false
      }
      return true
    })
  })

  return menuData
}

type RenderNoScriptMenuItemOptions = {
  renderListDisc?: boolean
  menuHeaderTopSpacing?: boolean
}

/**
 * This generates raw HTML. It's uses our trusted menu data but be very careful making change regardless.
 */
export const renderNoScriptMenuItem = (menuItem: MenuItem, options?: RenderNoScriptMenuItemOptions): string => {
  if (menuItem.href) {
    return `<li class="${options?.renderListDisc ? 'list-disc ml-5' : ''}"><a href="${htmlEscapeToText(menuItem.href)}">${htmlEscapeToText(menuItem.label)}</a>${menuItem.children
      ? `<ul>${menuItem.children.map(menuItem => renderNoScriptMenuItem(menuItem, options)).join('')}</ul>`
      : ''}</li>`
  }

  if (
    // NoScript users can't run click handler JS. Ignore this menu item.
    menuItem.click
  ) {
    return ''
  }

  if (menuItem.label && menuItem.children && menuItem.children.filter(menuItem => !menuItem.click).length > 0) {
    return `<li>${menuItem.label ? `<b class="${options?.menuHeaderTopSpacing ? 'inline-block mt-1' :''}">${htmlEscapeToText(menuItem.label)}</b>`
      : ''}${`<ul>${menuItem.children ? menuItem.children.map(menuItem => renderNoScriptMenuItem(menuItem, options)).join('') : ''}</ul>`
      }</li>`
  }

  return ''
}