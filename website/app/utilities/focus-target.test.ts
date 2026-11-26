// @vitest-environment nuxt
import { afterEach, describe, expect, test } from 'vitest'
import { focusMainHeading, focusTemporarily } from './focus-target'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('focusTemporarily', () => {
  test('focuses an element that is not focusable, and takes the tabindex away again on blur', () => {
    document.body.innerHTML = '<h1 id="heading">Title</h1><button id="other">Other</button>'
    const heading = document.getElementById('heading')!

    focusTemporarily(heading)
    expect(document.activeElement).toBe(heading)
    expect(heading.getAttribute('tabindex')).toBe('-1')

    document.getElementById('other')!.focus()
    expect(heading.hasAttribute('tabindex')).toBe(false)
  })

  test('leaves a tabindex the element already had', () => {
    document.body.innerHTML = '<div id="box" tabindex="0">Box</div><button id="other">Other</button>'
    const box = document.getElementById('box')!

    focusTemporarily(box)
    document.getElementById('other')!.focus()

    expect(box.getAttribute('tabindex')).toBe('0')
  })
})

describe('focusMainHeading', () => {
  test('focuses the heading in main', () => {
    document.body.innerHTML = '<header><h1 id="site">Site</h1></header><main><h1 id="page">Page</h1></main>'

    expect(focusMainHeading()).toBe(true)
    expect(document.activeElement?.id).toBe('page')
  })

  test('reports that there is no heading to focus', () => {
    document.body.innerHTML = '<main><p>No heading here</p></main><button id="other">Other</button>'
    document.getElementById('other')!.focus()

    expect(focusMainHeading()).toBe(false)
    expect(document.activeElement?.id).toBe('other')
  })
})
