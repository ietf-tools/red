import { AdvancedUISettings, GraphicsBustInSilhouette, GraphicsSearch, GraphicsUserPreferences } from '#components'
import { useUiSettingsStore } from '~/stores/ui-settings'
import { htmlEscapeToText } from '~/utilities/html'
import { useFeatureFlags } from '~/utilities/feature-flags'
import { useAuthStore } from '~/stores/auth'
import { oidcLogin, oidcLogout, oidcRegister } from '~/utilities/oidc'
import {
  ACCOUNT_HOME_PATH,
  IETF_PRIVACY_STATEMENT_URL,
  INTERNET_DRAFT_AUTHOR_RESOURCES_RFC_PUBLICATION_PROCESS_URL,
  markdownPathBuilder,
  SEARCH_PATH,
  useQueueUrlOrigin,
  type ValidHrefs
} from '~/utilities/url'
import type { VueClick, VueStyleClass } from '~/utilities/vue'

/**
 * Although this type is recursive the UI only renders about 2 levels deep
 */
export type MenuItem = {
  icon?: string | (() => VNode)
  label: string
  component?: ReturnType<typeof h>
  description?: string
  hideMobile?: boolean
  hideDesktop?: boolean
  hideLabelDesktop?: boolean
  hideDropdownIconDesktop?: boolean
  highlightLink?: boolean
  hideNewWindowIcon?: boolean
  desktopClass?: VueStyleClass
  noSpaLink?: boolean
  href?: string
  click?: VueClick
  /**
   * A function that returns whether the menu item is active
   * Used for the theme picker
   */
  isActiveFn?: () => boolean
  role?: 'modal-button' | 'radiogroup' | 'radio' | 'checkboxgroup' | 'checkbox'
  /**
   * The value a `radio`/`checkbox` child contributes to its group's model
   */
  fieldValue?: string
  /**
   * Writable model for a `radiogroup`: the currently selected `fieldValue`
   */
  radioGroupRef?: Ref<string>
  /**
   * Writable model for a `checkboxgroup`: the list of checked `fieldValue`s
   */
  checkboxGroupRef?: Ref<string[]>
  /**
   * Writable model for a `modal-button`: whether its dialog is showing
   */
  modalOpenRef?: Ref<boolean>
  modalTitle?: string
  modalBody?: () => VNode
  activeLabelFn?: () => string
  children?: MenuItem[]
}

export const colorPreferences = [
  { value: 'system', label: 'System default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

type Mode = 'desktop' | 'mobile'

export const groupLabelDomId = (mode: Mode, ...indexes: number[]): string => `${mode}-group-label-${indexes.join('-')}`

export const dropdownHeadingDomId = (mode: Mode, ...indexes: number[]): string =>
  `${mode}-dropdown-heading-label-${indexes.join('-')}`

export const descriptionDomId = (mode: Mode, ...indexes: number[]): string => `${mode}-description-${indexes.join('-')}`

export const useMenuData = (mode: Mode) => {
  const colorMode = useColorMode()
  const queueUrlOrigin = useQueueUrlOrigin()
  const uiSettings = useUiSettingsStore()
  const uiSettingsStoreRefs = storeToRefs(uiSettings)
  const { setIsUiSettingsModalOpen } = uiSettings
  const featureFlags = useFeatureFlags()
  const authStore = useAuthStore()
  const { isAuthenticated, user } = storeToRefs(authStore)

  // Writable model for the theme radio group. The selected value is the
  // colour-mode *preference* (e.g. 'system'), not the resolved value.
  const themeRef = computed<string>({
    get: () => colorMode.preference,
    set: (value) => {
      colorMode.preference = value || 'system'
    }
  })

  // Writable model for the UI Settings dialog, backed by the store so that the
  // desktop nav button, the mobile nav button and the dialog itself (which is
  // rendered outside both navs, see NavModals) all share one open state.
  const isUISettingsModalOpenRef = computed<boolean>({
    get: () => uiSettingsStoreRefs.isUiSettingsModalOpen.value,
    set: (isOpen) => setIsUiSettingsModalOpen(isOpen)
  })

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
            label: 'Browse all RFCs',
            href: '/rfc-index/' satisfies ValidHrefs
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
            label: 'How RFCs are created',
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
            href: INTERNET_DRAFT_AUTHOR_RESOURCES_RFC_PUBLICATION_PROCESS_URL satisfies ValidHrefs
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
        icon: () => h(GraphicsSearch, { class: 'w-[19px] h-[19px]' }),
        label: 'Search',
        href: SEARCH_PATH satisfies ValidHrefs
      }
    ]

    const themeAndPreferencesChildren: MenuItem[] = [
      {
        label: 'Theme',
        role: 'radiogroup',
        radioGroupRef: themeRef,
        children: colorPreferences.map(
          (colorPreference): MenuItem => ({
            label: colorPreference.label,
            activeLabelFn: () =>
              colorMode.preference === colorPreference.value
                ? `Selected ${colorPreference.label}`
                : `Not selected ${colorPreference.label}`,
            role: 'radio',
            fieldValue: colorPreference.value
          })
        )
      },
      {
        label: 'Advanced Settings',
        role: 'modal-button',
        modalTitle: 'Advanced Settings',
        modalOpenRef: isUISettingsModalOpenRef,
        desktopClass: 'mt-2 pt-2 border-t-1 border-t-gray-200',
        modalBody: () => h(AdvancedUISettings),
        click: () => {
          isUISettingsModalOpenRef.value = true
        }
      }
    ]

    // Personalisation account menu — gated on the `oidc` feature flag. Absent from SSR
    // and first client paint (flags default false, hydrate onMounted), so it appears only
    // after mount when the flag is on: no hydration mismatch, and the cached anonymous
    // HTML never contains it, so we don't affect worker proxy cache with per user
    // variations.
    if (featureFlags.value.oidc) {
      if (isAuthenticated.value) {
        const displayName = user.value?.name ?? user.value?.preferredUsername ?? 'Account'
        const picture = user.value?.picture
        data.push({
          label: displayName,
          hideLabelDesktop: true,
          icon: picture
            ? () => h('img', { src: picture, alt: `Picture of ${displayName}`, class: 'w-6 h-6 rounded-full' })
            : () => h(GraphicsBustInSilhouette, { 'aria-label': `${displayName}`, class: 'w-6 h-6 rounded-full' }),
          children: [
            {
              label: 'Account',
              href: ACCOUNT_HOME_PATH
            },
            {
              label: 'Sign out',
              click: () => {
                void oidcLogout()
              }
            },
            ...themeAndPreferencesChildren
          ]
        })
      } else {
        data.push({
          label: 'User menu',
          hideLabelDesktop: true,
          icon: () => h(GraphicsBustInSilhouette, { class: 'w-6 h-6 rounded-full' }),
          children: [
            {
              label: 'Create an account',
              click: () => {
                void oidcRegister()
              },
              highlightLink: true,
              hideNewWindowIcon: true
            },
            {
              label: 'Sign in',
              click: () => {
                void oidcLogin()
              },
              hideNewWindowIcon: true
            },
            ...themeAndPreferencesChildren
          ]
        })
      }
    } else {
      data.push({
        icon: () => h(GraphicsUserPreferences),
        label: 'Your preferences',
        hideLabelDesktop: true,
        children: themeAndPreferencesChildren
      })
    }

    return data.filter((item) => {
      // note: only a shallow filter, not deep
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

/**
 * A `modal-button` menu item that has everything NavModals needs to render its dialog
 */
export type ModalMenuItem = MenuItem & {
  modalOpenRef: Ref<boolean>
  modalTitle: string
}

const isModalMenuItem = (menuItem: MenuItem): menuItem is ModalMenuItem =>
  menuItem.role === 'modal-button' && menuItem.modalOpenRef !== undefined && menuItem.modalTitle !== undefined

/**
 * Flattens the menu tree down to its `modal-button` items. Their dialogs are rendered
 * once, outside the navs, rather than inside the menu item that opens them.
 */
export const collectModalMenuItems = (menuItems: MenuItem[]): ModalMenuItem[] =>
  menuItems.flatMap((menuItem) => [
    ...(isModalMenuItem(menuItem) ? [menuItem] : []),
    ...collectModalMenuItems(menuItem.children ?? [])
  ])

type RenderNoScriptMenuItemOptions = {
  renderListDisc?: boolean
  menuHeaderTopSpacing?: boolean
}

/**
 * This generates raw HTML. It's uses our trusted menu data but be very careful making change regardless.
 */
export const renderNoScriptMenuItem = (menuItem: MenuItem, options?: RenderNoScriptMenuItemOptions): string => {
  if (menuItem.href) {
    return `<li class="${options?.renderListDisc ? 'list-disc ml-5' : ''}"><a href="${htmlEscapeToText(menuItem.href)}">${htmlEscapeToText(menuItem.label)}</a>${
      menuItem.children
        ? `<ul>${menuItem.children.map((menuItem) => renderNoScriptMenuItem(menuItem, options)).join('')}</ul>`
        : ''
    }</li>`
  }

  if (
    // NoScript users can't run click handler JS. Ignore this menu item.
    menuItem.click
  ) {
    return ''
  }

  if (menuItem.label && menuItem.children && menuItem.children.filter((menuItem) => !menuItem.click).length > 0) {
    return `<li>${
      menuItem.label
        ? `<b class="${options?.menuHeaderTopSpacing ? 'inline-block mt-1' : ''}">${htmlEscapeToText(menuItem.label)}</b>`
        : ''
    }${`<ul>${menuItem.children ? menuItem.children.map((menuItem) => renderNoScriptMenuItem(menuItem, options)).join('') : ''}</ul>`}</li>`
  }

  return ''
}
