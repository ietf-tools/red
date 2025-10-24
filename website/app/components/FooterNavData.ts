import {
  CONTACT_PATH,
  DATATRACKER_URL_ORIGIN,
  IAB_URL_ORIGIN,
  IETF_URL_ORIGIN,
  INTERNET_DRAFT_AUTHOR_RESOURCES_URL_ORIGIN,
  IRTF_URL_ORIGIN
} from '~/utilities/url'

type MenuItem = {
  label: string
  children: { label: string; href: string }[]
}

export const menuData: MenuItem[] = [
  {
    label: 'Useful links',
    children: [
      { label: 'IETF.org', href: IETF_URL_ORIGIN },
      { label: 'IRTF.org', href: IRTF_URL_ORIGIN },
      { label: 'IAB.org', href: IAB_URL_ORIGIN },
      { label: 'Datatracker', href: DATATRACKER_URL_ORIGIN },
      {
        label: 'Author Resources',
        href: INTERNET_DRAFT_AUTHOR_RESOURCES_URL_ORIGIN
      }
    ]
  },
  {
    label: 'Contact Us',
    children: [
      { label: 'RFC Editor at IETF', href: CONTACT_PATH },
      {
        label: 'rfc-dist Info Page',
        href: 'http://mailman.rfc-editor.org/mailman/listinfo/rfc-dist'
      },
      {
        label: 'rfc-interest Info Page',
        href: 'http://mailman.rfc-editor.org/mailman/listinfo/rfc-interest'
      }
    ]
  }
  // FIXME: these should go on a markdown page
  // {
  //   label: 'Translations',
  //   children: [
  //     { label: 'Spanish', href: 'https://www.rfc-es.org/' },
  //     { label: 'French', href: 'http://abcdrfc.free.fr/' },
  //     { label: 'Japanese', href: 'http://rfc-jp.nic.ad.jp/' }
  //   ]
  // }
]
