type MenuItem = {
  label: string
  children: { label: string; href: string }[]
}

export const menuData: MenuItem[] = [
  {
    label: 'Useful links',
    children: [
      { label: 'IETF.org', href: 'https://www.ietf.org/' },
      { label: 'IRTF.org', href: 'https://www.irtf.org/' },
      { label: 'Datatracker', href: 'https://datatracker.ietf.org/' },
      {
        label: 'Internet-Draft Author Resources',
        href: 'https://authors.ietf.org/'
      },
      { label: 'Internet Society', href: 'https://www.internetsociety.org/' }
    ]
  },
  {
    label: 'Contact Us',
    children: [
      { label: 'RFC Editor at IETF', href: '/contact/at-ietf/' },
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
