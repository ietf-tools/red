// The subject hierarchy, built from the flat list Reef sends. Every entry in that list carries its
// `parent` and its `path`, which is what lets the whole tree be assembled from one answer with no
// second read and nothing nested in the payload.
//
// Nothing here filters. Matching a query is ~/utilities/subject-search's job, and stays there
// because the count a reader is told about is the count of subjects that actually matched — the
// ancestors this module pulls in around them are context, not matches.
import type { Subject } from './reef'

/**
 * The deepest level drawn. Reef's vocabulary can nest further than this; a level beyond it is
 * dropped rather than flattened into its parent, because a subject drawn at the wrong depth says
 * something false about where it sits.
 */
export const MAX_RENDERED_SUBJECT_DEPTH = 4

export type SubjectNode = Subject & {
  /** 1 for a root, up to MAX_RENDERED_SUBJECT_DEPTH. */
  depth: number
  children: SubjectNode[]
}

const PATH_SEPARATOR = '/'

/**
 * The ancestors of `subject`, outermost first, as the slugs its `path` names. The last segment is
 * the subject's own slug, so it is not one of them.
 */
export const ancestorSlugsOf = ({ path }: Subject): string[] => path.split(PATH_SEPARATOR).slice(0, -1)

/**
 * Whether this subject sits at a depth the tree is drawn to. Callers narrow the vocabulary with
 * this before counting as well as before building, so that a reader is never told about subjects
 * the page then declines to draw.
 */
export const isRenderableSubject = ({ path }: Subject): boolean =>
  path.split(PATH_SEPARATOR).length <= MAX_RENDERED_SUBJECT_DEPTH

/**
 * `subjects` as a forest, in the order they were given at each level.
 *
 * Reef sends the list in tree order, so a parent is already ahead of its children, but this reads
 * `parent` rather than relying on that: an order this depends on is one a caller could reasonably
 * sort and silently break.
 *
 * A subject whose parent is not in the list is treated as a root. That happens when the list has
 * been narrowed — to one document's subjects, or to a filter's matches — and dropping it instead
 * would lose the very subject the caller asked for.
 */
export const buildSubjectTree = (subjects: Subject[]): SubjectNode[] => {
  const nodesBySlug = new Map<string, SubjectNode>(
    subjects.map((subject) => [subject.slug, { ...subject, depth: 1, children: [] }])
  )

  const roots: SubjectNode[] = []

  for (const node of nodesBySlug.values()) {
    const { parent } = node
    const parentNode = parent === null ? undefined : nodesBySlug.get(parent)
    if (parentNode === undefined) {
      roots.push(node)
    } else {
      parentNode.children.push(node)
    }
  }

  // Depth is settled after the shape is, rather than while it is being assembled: a node's parent
  // may be reached after the node itself, so there is no depth to inherit at the time it is linked.
  const setDepth = (nodes: SubjectNode[], depth: number): SubjectNode[] =>
    nodes.map((node) => ({ ...node, depth, children: setDepth(node.children, depth + 1) }))

  return prunedToMaxDepth(setDepth(roots, 1))
}

const prunedToMaxDepth = (nodes: SubjectNode[]): SubjectNode[] =>
  nodes
    .filter(({ depth }) => depth <= MAX_RENDERED_SUBJECT_DEPTH)
    .map((node) => ({ ...node, children: prunedToMaxDepth(node.children) }))

/**
 * The tree holding `matches` and, so that each one is drawn where it belongs, the ancestors that
 * lead to them. `subjects` is the whole vocabulary, which is where those ancestors are found.
 *
 * The ancestors are not matches and are not counted as any: they are here because a subject four
 * levels down, drawn on its own, says nothing about what it is a subject of.
 */
export const subjectTreeOfMatches = (subjects: Subject[], matches: Subject[]): SubjectNode[] => {
  const keptSlugs = new Set<string>()
  for (const match of matches) {
    keptSlugs.add(match.slug)
    for (const slug of ancestorSlugsOf(match)) {
      keptSlugs.add(slug)
    }
  }

  // Walked over the vocabulary rather than over the kept slugs, so that what comes back is in the
  // order Reef sent rather than the order the matches happened to be in.
  return buildSubjectTree(subjects.filter(({ slug }) => keptSlugs.has(slug)))
}
