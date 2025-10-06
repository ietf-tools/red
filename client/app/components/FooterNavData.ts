import {
  CONTACT_PATH,
  DATATRACKER_URL,
  IETF_URL,
  INTERNET_DRAFT_AUTHOR_RESOURCES_URL,
  INTERNET_SOCIETY_URL,
  IRTF_URL
} from '~/utilities/url'

type MenuItem = {
  label: string
  children: { label: string; href: string }[]
}

export const menuData: MenuItem[] = [
  {
    label: 'Useful links',
    children: [
      { label: 'IETF.org', href: IETF_URL },
      { label: 'IRTF.org', href: IRTF_URL },
      { label: 'Datatracker', href: DATATRACKER_URL },
      {
        label: 'Internet-Draft Author Resources',
        href: INTERNET_DRAFT_AUTHOR_RESOURCES_URL
      },
      { label: 'Internet Society', href: INTERNET_SOCIETY_URL }
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
  },
  {
    label: 'Translations',
    children: [
      { label: 'Spanish', href: 'https://www.rfc-es.org/' },
      { label: 'French', href: 'http://abcdrfc.free.fr/' },
      { label: 'Japanese', href: 'http://rfc-jp.nic.ad.jp/' }
    ]
  }
]
