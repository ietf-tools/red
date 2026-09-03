import { describe, expect, test } from 'vitest'
import {
  ancestorSlugsOf,
  buildSubjectTree,
  isRenderableSubject,
  MAX_RENDERED_SUBJECT_DEPTH,
  subjectTreeOfMatches,
  type SubjectNode
} from './subject-tree'
import type { Subject } from './reef'

/** A subject named by where it sits, since that is all these are about. */
const subject = (path: string): Subject => {
  const slugs = path.split('/')
  const slug = slugs.at(-1) ?? path
  return {
    id: slugs.length,
    slug,
    name: slug,
    description: `about ${slug}`,
    parent: slugs.at(-2) ?? null,
    path,
    document_count: 1,
    document_count_deep: 1
  }
}

// In tree order, as Reef sends it: a parent ahead of the subjects beneath it.
const VOCABULARY: Subject[] = [
  subject('networking'),
  subject('networking/routing'),
  subject('security'),
  subject('security/authentication'),
  subject('security/authentication/tokens'),
  subject('security/authentication/tokens/json-web-tokens'),
  subject('security/authentication/tokens/json-web-tokens/jwt-claims')
]

/** Every slug in the forest, outermost first, as `parent > child` for the nesting to be visible. */
const shapeOf = (nodes: SubjectNode[], prefix = ''): string[] =>
  nodes.flatMap((node) => [`${prefix}${node.slug}`, ...shapeOf(node.children, `${prefix}${node.slug} > `)])

describe('ancestorSlugsOf', () => {
  test('names the subjects a subject sits inside, outermost first', () => {
    expect(ancestorSlugsOf(subject('security/authentication/tokens'))).toEqual(['security', 'authentication'])
  })

  test('gives a root nothing, because it is inside nothing', () => {
    expect(ancestorSlugsOf(subject('security'))).toEqual([])
  })
})

describe('isRenderableSubject', () => {
  test(`accepts a subject at the deepest level drawn`, () => {
    expect(isRenderableSubject(subject('a/b/c/d'))).toBe(true)
    expect('a/b/c/d'.split('/')).toHaveLength(MAX_RENDERED_SUBJECT_DEPTH)
  })

  test('refuses the level below it', () => {
    expect(isRenderableSubject(subject('a/b/c/d/e'))).toBe(false)
  })
})

describe('buildSubjectTree', () => {
  test('nests each subject inside the one it names as its parent', () => {
    expect(shapeOf(buildSubjectTree([subject('networking'), subject('networking/routing')]))).toEqual([
      'networking',
      'networking > routing'
    ])
  })

  test('numbers the levels from the root down, so a renderer need not count', () => {
    const [networking] = buildSubjectTree([subject('networking'), subject('networking/routing')])

    expect(networking?.depth).toBe(1)
    expect(networking?.children[0]?.depth).toBe(2)
  })

  test(`cuts the tree off below ${MAX_RENDERED_SUBJECT_DEPTH} levels`, () => {
    // The whole branch is kept as far as the cut, which is where a reader can still follow it: only
    // the level past the cut is refused.
    expect(shapeOf(buildSubjectTree(VOCABULARY))).toEqual([
      'networking',
      'networking > routing',
      'security',
      'security > authentication',
      'security > authentication > tokens',
      'security > authentication > tokens > json-web-tokens'
    ])
  })

  test('reads the parent rather than trusting the order it was given', () => {
    // Reef does send parents first, but a caller that sorted this list would otherwise get a
    // silently flattened tree instead of an error.
    const reversed = [...VOCABULARY].reverse().filter(isRenderableSubject)

    // Nested the same way whatever order it arrived in. Only which root comes first follows the
    // list, because that is the one thing an order is allowed to say.
    expect(shapeOf(buildSubjectTree(reversed))).toEqual([
      'security',
      'security > authentication',
      'security > authentication > tokens',
      'security > authentication > tokens > json-web-tokens',
      'networking',
      'networking > routing'
    ])
  })

  test('raises a subject whose parent is not in the list to a root, rather than dropping it', () => {
    // Which is what a narrowed list is: the subjects of one document, say, whose parents were not
    // asked for. Dropping them would lose the very subjects the caller asked about.
    expect(shapeOf(buildSubjectTree([subject('security/authentication/tokens')]))).toEqual(['tokens'])
  })

  test('takes an empty vocabulary', () => {
    expect(buildSubjectTree([])).toEqual([])
  })
})

describe('subjectTreeOfMatches', () => {
  const matching = (...paths: string[]) =>
    shapeOf(subjectTreeOfMatches(VOCABULARY.filter(isRenderableSubject), paths.map(subject)))

  test('draws a match under every subject it sits inside', () => {
    expect(matching('networking/routing')).toEqual(['networking', 'networking > routing'])
  })

  test('carries the whole trail down to a match at the deepest level', () => {
    expect(matching('security/authentication/tokens/json-web-tokens')).toEqual([
      'security',
      'security > authentication',
      'security > authentication > tokens',
      'security > authentication > tokens > json-web-tokens'
    ])
  })

  test('leaves out the subjects beneath a match, which were not matched', () => {
    expect(matching('networking')).toEqual(['networking'])
  })

  test('keeps the order Reef sent rather than the order the matches arrived in', () => {
    expect(matching('security', 'networking')).toEqual(['networking', 'security'])
  })

  test('draws nothing when nothing matched', () => {
    expect(matching()).toEqual([])
  })
})
