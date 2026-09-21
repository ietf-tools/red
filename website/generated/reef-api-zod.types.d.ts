export namespace Schemas {
  // <Schemas>
  /**
   * The area or group a document belongs to, narrowed to what a page names.
   */
  export type DocumentAreaOrGroup = { acronym: string; name: string } & Record<string, unknown>
  /**
   * One persistent identifier -- a DOI or an ISSN -- Red records for a document.
   */
  export type DocumentIdentifier = { type: string; value: string } & Record<string, unknown>
  /**
   * A document as the index file names it: just enough to render a row.
   */
  export type DocumentMetadata = { title: string | null; subseries: Array<string> } & Record<string, unknown>
  export type DocumentSetEntry = {
    doc: string
    /**
     * Lower sorts first
     */
    rank: number
    added_at: string
  } & Record<string, unknown>
  export type DocumentSet = {
    id: string
    title: string
    description?: string
    documents: Array<DocumentSetEntry>
    created_at: string
    updated_at: string
  } & Record<string, unknown>
  /**
   * The set's documents, in the order they should be shown.
   */
  export type DocumentSetOrder = { documents: Array<string> } & Record<string, unknown>
  /**
   * Public engagement numbers for one document.
   */
  export type DocumentStats = {
    doc: string
    rating_average: number | null
    rating_count: number
    subscriber_count: number
    set_count: number
  } & Record<string, unknown>
  /**
   * A document as its own subject's file names it: everything Red's index says.
   */
  export type FullDocumentMetadata = {
    title: string | null
    subseries: Array<string>
    status: string | null
    status_name: string | null
    stream: string | null
    stream_name: string | null
    obsoletes: Array<number>
    obsoleted_by: Array<number>
    updates: Array<number>
    updated_by: Array<number>
    authors: Array<string>
    published: string | null
    identifiers: Array<DocumentIdentifier>
    area: DocumentAreaOrGroup | null
    group: DocumentAreaOrGroup | null
    keywords: Array<string>
    pages: number | null
    abstract: string | null
  } & Record<string, unknown>
  /**
   * * `new_rfc` - Any new RFC
   * * `by_status` - New RFC by status
   * * `obsoleted` - RFC obsoleted or made historic
   * * `rfc` - Changes to one specific RFC
   * * `set` - Changes to anything in a document set
   * * `subject` - Changes to anything carrying a subject
   */
  export type KindEnum = 'new_rfc' | 'by_status' | 'obsoleted' | 'rfc' | 'set' | 'subject'
  /**
   * What one document is to the caller: their rating, their subscription,
   * their sets.
   *
   * Nothing public: no average, no count, no subscriber total. Those are the
   * same for everybody, so Red takes them from the data it already has for the
   * route rather than from a per-caller request.
   */
  export type MyDocument = {
    doc: string
    your_rating: number | null
    your_subscription_id: number | null
    your_set_ids: Array<string>
  } & Record<string, unknown>
  /**
   * One of the caller's sets, without its membership.
   *
   * Deliberately not docsets.DocumentSetSerializer: that one carries the set's
   * whole `documents` array, which is the thing this endpoint exists to avoid
   * sending. A client drawing "which of my sets hold this document" needs every
   * set the caller owns to label the rows, but it only needs membership for the
   * documents it is asking about — and that arrives per document as
   * `your_set_ids`. Sending both would make the payload grow with the caller's
   * library rather than with the page.
   */
  export type MyDocumentSet = {
    id: string
    title: string
    description: string
    created_at: string
    updated_at: string
  } & Record<string, unknown>
  /**
   * The whole response: the caller's sets, and a row per requested document.
   */
  export type MyDocuments = { sets: Array<MyDocumentSet>; documents: Array<MyDocument> } & Record<string, unknown>
  /**
   * * `open` - Open (anonymous)
   * * `authenticated` - Authenticated only
   */
  export type VisibilityEnum = 'open' | 'authenticated'
  /**
   * One survey as Red offers it, which is as a toast.
   *
   * The fields line up with Red's Notification: title, description and url are shown,
   * and slug is the string Red keys a dismissal on. documents is the addition that
   * tells it where to offer this at all.
   *
   * visibility says whether the runner will admit an anonymous visitor, so Red can
   * offer an authenticated-only survey to a signed-in reader alone rather than
   * sending an anonymous one to a runner that refuses them. It is the field that
   * tells the two apart in the one payload that mixes them, which is the
   * precomputed surveys/published.json; the rows an anonymous caller is served,
   * here or from that store's surveys/open.json, are all "open" by construction.
   */
  export type OpenSurvey = {
    id: number
    slug: string
    title: string
    description?: string
    url: string
    documents: Array<string> | null
    visibility?: VisibilityEnum
  } & Record<string, unknown>
  export type PatchedDocumentSet = Partial<{
    id: string
    title: string
    description: string
    documents: Array<DocumentSetEntry>
    created_at: string
    updated_at: string
  }>
  /**
   * * `draft` - Draft
   * * `published` - Published
   * * `closed` - Closed
   */
  export type StatusEnum = 'draft' | 'published' | 'closed'
  /**
   * Full survey representation used by the management API and the builder.
   */
  export type PatchedSurvey = Partial<{
    id: number
    slug: string
    title: string
    description: string
    definition: unknown
    theme: null
    status: StatusEnum
    visibility: VisibilityEnum
    audience: null
    created_at: string
    updated_at: string
  }>
  export type PopularEntry = {
    rfc: string
    /**
     * Lower sorts first
     */
    rank?: number
  } & Record<string, unknown>
  /**
   * One ancestor on the way up to the root, root first.
   *
   * The same fields ``Subject``/``SubjectIndexEntrySerializer`` already carry,
   * minus what only makes sense on a subject's own file (``children``,
   * ``path``). No nested children of its own: the ancestor chain is a single
   * line up to the root, so there is nothing to nest.
   */
  export type SubjectAncestor = {
    slug: string
    name: string
    description: string
    document_count: number
    document_count_deep: number
  } & Record<string, unknown>
  /**
   * One subject in a descendant branch, with its own children nested beneath it.
   *
   * A tree, not a flat map keyed by slug: a page rendering a nested listing
   * needs to know which subject is whose child, and a flat map throws that
   * relationship away.
   */
  export type SubjectBranchNode = {
    slug: string
    name: string
    description: string
    document_count: number
    document_count_deep: number
    children: SubjectBranchNodeArray
  } & Record<string, unknown>
  export interface SubjectBranchNodeArray extends Array<SubjectBranchNode> {}
  /**
   * A subject's branch of the vocabulary: its ancestors and its whole
   * descendant subtree, so that a page renders both without a second fetch.
   *
   * Not siblings, and not the subject itself, which carries its own name and
   * description at the top level of this same file already.
   */
  export type SubjectMeta = { ancestors: Array<SubjectAncestor>; descendants: Array<SubjectBranchNode> } & Record<
    string,
    unknown
  >
  /**
   * A subject's own file: the served shape plus what a page cannot look up.
   *
   * Both additions are sibling maps rather than changes to the arrays they
   * describe. Retyping `documents` into a list of objects, or `children` into
   * one, is the change that breaks a caller, and it is what Reef asks Red not to
   * do to it. A map also grows a field later without retyping anything.
   */
  export type PrecomputedSubjectDetail = {
    id: number
    /**
     * Stable identifier used in URLs and by Red. Changing it leaves the old one behind as an alias, so links naming it still resolve; the name is still the field to edit when only the wording changed.
     */
    slug: string
    /**
     * How the subject is shown to readers.
     */
    name: string
    /**
     * What belongs under this subject, for whoever curates it next and for a caller drawing a picker.
     */
    description: string
    parent: string | null
    /**
     * Slugs from the top down, separated by a slash. Derived; edit the slug or the parent instead.
     */
    path: string
    document_count: number
    document_count_deep: number
    retired: boolean
    children: Array<string>
    aliases: Array<string>
    /**
     * The documents assigned to this subject, and not to those beneath it.
     *
     * Direct assignments only. Red consumes this array and the precomputer keys
     * document_meta off it, so widening it to the subtree would be a contract
     * change. The subtree is the index file's business.
     */
    documents: Array<string>
    document_meta: Record<string, FullDocumentMetadata>
    subject_meta: SubjectMeta
  } & Record<string, unknown>
  /**
   * A retired subject, as the only thing a retired subject is still for.
   *
   * Deliberately not the detail shape. A retired subject is not offered, does not
   * appear in the vocabulary, and should not be rendered as though it were current;
   * what is left is enough to redirect a link that names it. Callers tell the two
   * apart by `retired`, which the live shape also carries.
   */
  export type RetiredSubject = {
    /**
     * Stable identifier used in URLs and by Red. Changing it leaves the old one behind as an alias, so links naming it still resolve; the name is still the field to edit when only the wording changed.
     */
    slug: string
    retired: boolean
    /**
     * Stable identifier used in URLs and by Red. Changing it leaves the old one behind as an alias, so links naming it still resolve; the name is still the field to edit when only the wording changed.
     */
    merged_into: string
  } & Record<string, unknown>
  /**
   * An alias, as the only thing an alias is for: the name it resolves to.
   *
   * Not the subject's own payload served under the alias's URL. That would answer
   * the read in one fetch, at the cost of publishing the same subject under two
   * addresses with nothing saying which one is canonical, and canonicalising a link
   * is the whole reason a caller asked. So the same stub shape a retired subject
   * gets, and callers tell the shapes apart by which key is present.
   */
  export type SubjectAlias = {
    /**
     * A name that resolves to this subject. Readers following a link that uses it are redirected to the subject's own slug.
     */
    slug: string
    /**
     * Stable identifier used in URLs and by Red. Changing it leaves the old one behind as an alias, so links naming it still resolve; the name is still the field to edit when only the wording changed.
     */
    alias_of: string
  } & Record<string, unknown>
  export type PrecomputedSubjectDetailOrRedirect = PrecomputedSubjectDetail | RetiredSubject | SubjectAlias
  export type RatingAggregate = {
    rfc: string
    average: number | null
    count: number
    your_rating: number | null
  } & Record<string, unknown>
  export type RatingWrite = { value: number } & Record<string, unknown>
  export type ResponseCreate = Partial<{ data: unknown; meta: unknown }>
  /**
   * A subject as a caller sees it, without its membership.
   *
   * The id is carried as well as the slug because subscribing names the id:
   * the subscription holds a foreign key so that renaming a subject cannot
   * detach its subscribers, and the id is the half of a subject's identity
   * that a rename does not touch.
   *
   * parent and path are what let a caller build the tree from the flat list in one
   * pass, with no second read and nothing nested. Both counts are carried because
   * a picker wants a figure against every node without walking the subtree to get
   * one, and because they are two integers.
   */
  export type Subject = {
    id: number
    /**
     * Stable identifier used in URLs and by Red. Changing it leaves the old one behind as an alias, so links naming it still resolve; the name is still the field to edit when only the wording changed.
     */
    slug: string
    /**
     * How the subject is shown to readers.
     */
    name: string
    /**
     * What belongs under this subject, for whoever curates it next and for a caller drawing a picker.
     */
    description: string
    parent: string | null
    /**
     * Slugs from the top down, separated by a slash. Derived; edit the slug or the parent instead.
     */
    path: string
    document_count: number
    document_count_deep: number
  } & Record<string, unknown>
  /**
   * A subject and the documents carrying it.
   *
   * Separate from the list serializer for the reason me.MyDocumentSetSerializer
   * is separate from docsets.DocumentSetSerializer: a picker needs every
   * subject and no membership, so sending membership in the list would make
   * the payload grow with the whole catalogue rather than with the vocabulary.
   */
  export type SubjectDetail = {
    id: number
    /**
     * Stable identifier used in URLs and by Red. Changing it leaves the old one behind as an alias, so links naming it still resolve; the name is still the field to edit when only the wording changed.
     */
    slug: string
    /**
     * How the subject is shown to readers.
     */
    name: string
    /**
     * What belongs under this subject, for whoever curates it next and for a caller drawing a picker.
     */
    description: string
    parent: string | null
    /**
     * Slugs from the top down, separated by a slash. Derived; edit the slug or the parent instead.
     */
    path: string
    document_count: number
    document_count_deep: number
    retired: boolean
    children: Array<string>
    aliases: Array<string>
    /**
     * The documents assigned to this subject, and not to those beneath it.
     *
     * Direct assignments only. Red consumes this array and the precomputer keys
     * document_meta off it, so widening it to the subtree would be a contract
     * change. The subtree is the index file's business.
     */
    documents: Array<string>
  } & Record<string, unknown>
  export type SubjectDetailOrRedirect = SubjectDetail | RetiredSubject | SubjectAlias
  /**
   * One subject in the index file.
   *
   * Field order is the file's key order: a run that finds the same data must
   * write the same bytes. It is the list serializer's fields plus the two the
   * index adds.
   */
  export type SubjectIndexEntry = {
    id: number
    name: string
    description: string
    parent: string | null
    path: string
    children: Array<string>
    documents: Array<string>
    document_count: number
    document_count_deep: number
  } & Record<string, unknown>
  /**
   * The whole vocabulary in one payload: the tree, the assignments, the titles.
   *
   * Two maps rather than two lists, both keyed, so that a caller looks a subject
   * or a document up directly instead of building an index of its own. The
   * metadata sits in one map referenced by identifier rather than beside each
   * subject that carries the document, which would repeat every title once per
   * covering subject.
   *
   * What is deliberately absent is each subject's subtree. It is derivable from
   * ``path`` and ``children`` in the pass a caller is already making, and writing
   * it out would store every identifier once per ancestor.
   */
  export type SubjectIndex = {
    documents: Record<string, DocumentMetadata>
    subjects: Record<string, SubjectIndexEntry>
  } & Record<string, unknown>
  export type Subscription = {
    id: number
    kind: KindEnum
    params?: unknown
    set?: string | null
    subject?: number | null
    created_at: string
  } & Record<string, unknown>
  /**
   * Full survey representation used by the management API and the builder.
   */
  export type Survey = {
    id: number
    slug: string
    title: string
    description?: string
    definition?: unknown
    theme?: null
    status?: StatusEnum
    visibility?: VisibilityEnum
    audience?: null
    created_at: string
    updated_at: string
  } & Record<string, unknown>
  /**
   * Definition and theme served to the Nuxt runner.
   */
  export type SurveyDefinition = {
    slug: string
    title: string
    description?: string
    definition?: unknown
    theme?: null
    visibility?: VisibilityEnum
  } & Record<string, unknown>

  // </Schemas>
}

export namespace Endpoints {
  // <Endpoints>

  /**
   * Return the authenticated caller's rating, subscription and set membership for each named document, along with the caller's own sets. One call for a whole page of documents.
   *
   * `doc` is repeatable and identifiers are canonicalized, so `rfc9110` and `RFC 9110` address the same document; the series has to be named, so `9110` on its own is rejected. A named document is always returned, with nulls if the caller has no state for it. At most 100 documents per request.
   *
   * Naming no document returns the caller's sets and an empty `documents` list, which is how a client loads the set list on its own. Unlike `/stats/`, an empty `doc` does not mean every document: that endpoint is swept once at build time, whereas this one is called on every page.
   *
   * Carries no public numbers. Ratings averages, subscriber counts and set counts are the same for every visitor and are served by `/stats/`.
   */
  export type get_Me_documents_retrieve = {
    method: 'GET'
    path: '/api/reef/me/documents/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      query?: Partial<{ doc: Array<string> }>
    }
    responses: { 200: Schemas.MyDocuments }
  }
  /**
   * The curated most-popular list. Public; consumed by Red at build time.
   */
  export type get_Popularity_list = {
    method: 'GET'
    path: '/api/reef/popularity/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: never
    responses: { 200: Array<Schemas.PopularEntry> }
  }
  /**
   * Not a served endpoint. This describes the payload the precomputer publishes to `subjects.json` in the blob store, which is where Red reads it from; no deployment routes this path.
   *
   * It is the vocabulary as a tree with every assignment and every document title, in one file, so that a caller renders the subject listing from a single fetch. Two keyed maps: `subjects` by slug in tree order, and `documents` by identifier, referenced from the entries rather than repeated beside each subject that covers the document. A document's fuller metadata -- status, authors, abstract and the rest -- is on its own subject's file, not repeated here for every subject that covers it.
   *
   * Retired subjects and aliases are absent: they are not offered, and the per-subject files are what answer for them.
   */
  export type get_Precomputed_subject_index_retrieve = {
    method: 'GET'
    path: '/api/reef/precomputed/subjects/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: never
    responses: { 200: Schemas.SubjectIndex }
  }
  /**
   * Not a served endpoint. This describes the payload the precomputer publishes to `subjects/<slug>.json` in the blob store; no deployment routes this path.
   *
   * One file per subject, which is what lets a subject page in Red be a single fetch. It is the served `/api/reef/subjects/{slug}/` response plus `document_meta`, Red's own metadata for each document assigned here, and `subject_meta`, every ancestor up to the root and every descendant through this subject's whole branch -- not siblings -- so that a page can draw a breadcrumb or a nested listing without a second fetch for the rest of the vocabulary.
   *
   * A retired subject and an alias are published here too, as the same redirect stubs the served read returns, because a blob store cannot answer with a 301. Neither carries `documents`, so neither gains the two maps.
   */
  export type get_Precomputed_subject_detail_retrieve = {
    method: 'GET'
    path: '/api/reef/precomputed/subjects/{slug}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { slug: string }
    }
    responses: { 200: Schemas.PrecomputedSubjectDetailOrRedirect }
  }
  /**
   * Not a served endpoint. This describes the payload the precomputer publishes to `stats.json` in the blob store, which is where Red reads it from; no deployment routes this path.
   *
   * The same public engagement numbers as `/api/reef/stats/`, swept for every document with any engagement at once rather than queried per document, plus `title` and `subseries` so a consumer without its own copy of Red's index can still label a row. A document with no rating, subscriber or set at all is omitted rather than listed with zeros.
   */
  export type get_Precomputed_stats_retrieve = {
    method: 'GET'
    path: '/api/reef/precomputed/stats/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: never
    responses: { 200: Array<Schemas.DocumentStats> }
  }
  /**
   * Not a served endpoint. This describes the payload the precomputer publishes to `surveys/published.json` in the blob store, which is where Red reads it from; no deployment routes this path.
   *
   * Every published survey, whatever its visibility, so that Red can decide what to offer a signed-in reader without a call to the API. `visibility` is the field that decides: offer an `authenticated` row only to a reader who is signed in, since the runner refuses an anonymous visitor and the survey's definition is not published for them either.
   *
   * `surveys/open.json` is the subset an anonymous reader may be offered, and is what the served `/api/reef/surveys/open/` returns without a credential. Unlike that endpoint with one, this file cannot leave out a survey the reader has already answered: it is one payload for every reader.
   */
  export type get_Precomputed_survey_list_retrieve = {
    method: 'GET'
    path: '/api/reef/precomputed/surveys/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: never
    responses: { 200: Array<Schemas.OpenSurvey> }
  }
  /**
   * Return the public average and count of ratings for one RFC. Open to anonymous callers. A credential adds nothing but `your_rating`, the caller's own 1-5 rating of this RFC, which is null if they have not rated it; for an anonymous caller it is always null.
   *
   * The identifier is canonicalized, so `9110`, `rfc9110` and `RFC 9110` all address the same document.
   */
  export type get_Ratings_retrieve = {
    method: 'GET'
    path: '/api/reef/ratings/{rfc}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { rfc: string }
    }
    responses: { 200: Schemas.RatingAggregate }
  }
  /**
   * Record the authenticated caller's 1-5 rating of one RFC, replacing their previous rating of it if there is one. Requires a credential. Returns the same body as GET, so the response carries the recomputed average and count along with `your_rating` echoing the value just set.
   */
  export type put_Ratings_update = {
    method: 'PUT'
    path: '/api/reef/ratings/{rfc}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { rfc: string }

      body: Schemas.RatingWrite
    }
    responses: { 200: Schemas.RatingAggregate }
  }
  /**
   * Remove the authenticated caller's rating of one RFC, so it no longer counts towards the average. Requires a credential. Idempotent: a caller who has not rated this RFC gets the same response as one whose rating was just removed. Returns the same body as GET, so the response carries the recomputed average and count, with `your_rating` now null.
   */
  export type delete_Ratings_destroy = {
    method: 'DELETE'
    path: '/api/reef/ratings/{rfc}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { rfc: string }
    }
    responses: { 200: Schemas.RatingAggregate }
  }
  /**
   * OpenApi3 schema for this API. Format can be selected via content negotiation.
   *
   * - YAML: application/vnd.oai.openapi
   * - JSON: application/vnd.oai.openapi+json
   */
  export type get_Schema_retrieve = {
    method: 'GET'
    path: '/api/reef/schema/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      query?: Partial<{
        format: 'json' | 'yaml'
        lang:
          | 'af'
          | 'ar'
          | 'ar-dz'
          | 'ast'
          | 'az'
          | 'be'
          | 'bg'
          | 'bn'
          | 'br'
          | 'bs'
          | 'ca'
          | 'ckb'
          | 'cs'
          | 'cy'
          | 'da'
          | 'de'
          | 'dsb'
          | 'el'
          | 'en'
          | 'en-au'
          | 'en-gb'
          | 'eo'
          | 'es'
          | 'es-ar'
          | 'es-co'
          | 'es-mx'
          | 'es-ni'
          | 'es-ve'
          | 'et'
          | 'eu'
          | 'fa'
          | 'fi'
          | 'fr'
          | 'fy'
          | 'ga'
          | 'gd'
          | 'gl'
          | 'he'
          | 'hi'
          | 'hr'
          | 'hsb'
          | 'hu'
          | 'hy'
          | 'ia'
          | 'id'
          | 'ig'
          | 'io'
          | 'is'
          | 'it'
          | 'ja'
          | 'ka'
          | 'kab'
          | 'kk'
          | 'km'
          | 'kn'
          | 'ko'
          | 'ky'
          | 'lb'
          | 'lt'
          | 'lv'
          | 'mk'
          | 'ml'
          | 'mn'
          | 'mr'
          | 'ms'
          | 'my'
          | 'nb'
          | 'ne'
          | 'nl'
          | 'nn'
          | 'os'
          | 'pa'
          | 'pl'
          | 'pt'
          | 'pt-br'
          | 'ro'
          | 'ru'
          | 'sk'
          | 'sl'
          | 'sq'
          | 'sr'
          | 'sr-latn'
          | 'sv'
          | 'sw'
          | 'ta'
          | 'te'
          | 'tg'
          | 'th'
          | 'tk'
          | 'tr'
          | 'tt'
          | 'udm'
          | 'ug'
          | 'uk'
          | 'ur'
          | 'uz'
          | 'vi'
          | 'zh-hans'
          | 'zh-hant'
      }>
    }
    responses: { 200: Record<string, unknown> | Record<string, unknown> }
  }
  /**
   * List and create the caller's document sets.
   */
  export type get_Sets_list = {
    method: 'GET'
    path: '/api/reef/sets/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: never
    responses: { 200: Array<Schemas.DocumentSet> }
  }
  /**
   * List and create the caller's document sets.
   */
  export type post_Sets_create = {
    method: 'POST'
    path: '/api/reef/sets/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      body: Schemas.DocumentSet
    }
    responses: { 201: Schemas.DocumentSet }
  }
  /**
   * Read a set; retitle, redescribe or delete your own.
   *
   * One URL for a set, whoever is asking. Holding the unguessable id is the
   * whole of the read permission; writes are the owner's, and 404 rather than
   * 403 so the refusal says nothing about whose it is.
   *
   * A set staff have taken down 404s here too, for everyone alike: it is left
   * out of the queryset rather than refused, so nothing confirms it exists.
   */
  export type get_Sets_retrieve = {
    method: 'GET'
    path: '/api/reef/sets/{id}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { id: string }
    }
    responses: { 200: Schemas.DocumentSet }
  }
  /**
   * Read a set; retitle, redescribe or delete your own.
   *
   * One URL for a set, whoever is asking. Holding the unguessable id is the
   * whole of the read permission; writes are the owner's, and 404 rather than
   * 403 so the refusal says nothing about whose it is.
   *
   * A set staff have taken down 404s here too, for everyone alike: it is left
   * out of the queryset rather than refused, so nothing confirms it exists.
   */
  export type put_Sets_update = {
    method: 'PUT'
    path: '/api/reef/sets/{id}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { id: string }

      body: Schemas.DocumentSet
    }
    responses: { 200: Schemas.DocumentSet }
  }
  /**
   * Read a set; retitle, redescribe or delete your own.
   *
   * One URL for a set, whoever is asking. Holding the unguessable id is the
   * whole of the read permission; writes are the owner's, and 404 rather than
   * 403 so the refusal says nothing about whose it is.
   *
   * A set staff have taken down 404s here too, for everyone alike: it is left
   * out of the queryset rather than refused, so nothing confirms it exists.
   */
  export type patch_Sets_partial_update = {
    method: 'PATCH'
    path: '/api/reef/sets/{id}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { id: string }

      body: Schemas.PatchedDocumentSet
    }
    responses: { 200: Schemas.DocumentSet }
  }
  /**
   * Read a set; retitle, redescribe or delete your own.
   *
   * One URL for a set, whoever is asking. Holding the unguessable id is the
   * whole of the read permission; writes are the owner's, and 404 rather than
   * 403 so the refusal says nothing about whose it is.
   *
   * A set staff have taken down 404s here too, for everyone alike: it is left
   * out of the queryset rather than refused, so nothing confirms it exists.
   */
  export type delete_Sets_destroy = {
    method: 'DELETE'
    path: '/api/reef/sets/{id}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { id: string }
    }
    responses: { 204: unknown }
  }
  /**
   * Add or remove one document.
   *
   * PUT is idempotent, and the identifier is canonicalized first, so
   * .../documents/RFC%209110/ and .../documents/rfc9110/ are the same entry.
   */
  export type put_Sets_documents_update = {
    method: 'PUT'
    path: '/api/reef/sets/{id}/documents/{doc}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { doc: string; id: string }
    }
    responses: { 200: Schemas.DocumentSet; 201: Schemas.DocumentSet }
  }
  /**
   * Add or remove one document.
   *
   * PUT is idempotent, and the identifier is canonicalized first, so
   * .../documents/RFC%209110/ and .../documents/rfc9110/ are the same entry.
   */
  export type delete_Sets_documents_destroy = {
    method: 'DELETE'
    path: '/api/reef/sets/{id}/documents/{doc}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { doc: string; id: string }
    }
    responses: { 204: unknown }
  }
  /**
   * Rewrite the display order in one request.
   *
   * Ranks are replaced as a block rather than patched per entry, so a
   * drag-and-drop is one call that cannot half-apply.
   */
  export type put_Sets_order_update = {
    method: 'PUT'
    path: '/api/reef/sets/{id}/order/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { id: string }

      body: Schemas.DocumentSetOrder
    }
    responses: { 200: Schemas.DocumentSet }
  }
  /**
   * Rating, subscriber and set numbers per document.
   *
   * Public and unpaginated: Red precomputes the whole series in one call at
   * build time, which is too many identifiers to name in a query string.
   * Filtering with doc is for one-off lookups.
   */
  export type get_Stats_list = {
    method: 'GET'
    path: '/api/reef/stats/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      query?: Partial<{ doc: Array<string>; set: string }>
    }
    responses: { 200: Array<Schemas.DocumentStats> }
  }
  /**
   * Every subject that exists, in tree order. Public and unpaginated: the vocabulary is curated by staff rather than self-served, so it stays small enough to hand over whole.
   *
   * The list is in tree order, and every entry carries `parent` and `path`, so a caller builds the hierarchy from it in one pass without a second read. `document_count` is the documents assigned to the subject itself; `document_count_deep` includes everything beneath it, deduplicated.
   *
   * `doc` narrows the list to the subjects carried by one document, which is how a caller renders the subjects on an RFC page. It returns the subjects actually assigned rather than their ancestors too; a caller wanting the breadcrumb reads it off `path`. The identifier is canonicalized, so `rfc9110` and `RFC 9110` address the same document, and the series has to be named.
   */
  export type get_Subjects_list = {
    method: 'GET'
    path: '/api/reef/subjects/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      query?: Partial<{ doc: string }>
    }
    responses: { 200: Array<Schemas.Subject> }
  }
  /**
   * Three shapes, told apart by which key is present. A live subject comes back in full, with `documents` and its other names in `aliases`. A retired one comes back as `slug`, `retired` and `merged_into` only: it is no longer offered and should not be rendered as current, and what is left is enough to redirect a link that names it. An alias comes back as `slug` and `alias_of`, naming the subject to redirect to.
   *
   * A subject's own slug always wins, so a name is never both.
   */
  export type get_Subjects_retrieve = {
    method: 'GET'
    path: '/api/reef/subjects/{slug}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { slug: string }
    }
    responses: { 200: Schemas.SubjectDetailOrRedirect }
  }
  /**
   * List and create the current user's subscriptions.
   */
  export type get_Subscriptions_list = {
    method: 'GET'
    path: '/api/reef/subscriptions/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: never
    responses: { 200: Array<Schemas.Subscription> }
  }
  /**
   * List and create the current user's subscriptions.
   */
  export type post_Subscriptions_create = {
    method: 'POST'
    path: '/api/reef/subscriptions/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      body: Schemas.Subscription
    }
    responses: { 201: Schemas.Subscription }
  }
  /**
   * Delete one of the current user's subscriptions.
   */
  export type delete_Subscriptions_destroy = {
    method: 'DELETE'
    path: '/api/reef/subscriptions/{id}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { id: number }
    }
    responses: { 204: unknown }
  }
  /**
   * List and create surveys. Staff only; used by the builder.
   */
  export type get_Surveys_list = {
    method: 'GET'
    path: '/api/reef/surveys/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: never
    responses: { 200: Array<Schemas.Survey> }
  }
  /**
   * List and create surveys. Staff only; used by the builder.
   */
  export type post_Surveys_create = {
    method: 'POST'
    path: '/api/reef/surveys/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      body: Schemas.Survey
    }
    responses: { 201: Schemas.Survey }
  }
  /**
   * Retrieve, update, or delete a survey. Staff only; used by the builder.
   */
  export type get_Surveys_retrieve = {
    method: 'GET'
    path: '/api/reef/surveys/{id}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { id: number }
    }
    responses: { 200: Schemas.Survey }
  }
  /**
   * Retrieve, update, or delete a survey. Staff only; used by the builder.
   */
  export type put_Surveys_update = {
    method: 'PUT'
    path: '/api/reef/surveys/{id}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { id: number }

      body: Schemas.Survey
    }
    responses: { 200: Schemas.Survey }
  }
  /**
   * Retrieve, update, or delete a survey. Staff only; used by the builder.
   */
  export type patch_Surveys_partial_update = {
    method: 'PATCH'
    path: '/api/reef/surveys/{id}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { id: number }

      body: Schemas.PatchedSurvey
    }
    responses: { 200: Schemas.Survey }
  }
  /**
   * Retrieve, update, or delete a survey. Staff only; used by the builder.
   */
  export type delete_Surveys_destroy = {
    method: 'DELETE'
    path: '/api/reef/surveys/{id}/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { id: number }
    }
    responses: { 204: unknown }
  }
  /**
   * Aggregated results feeding the analytics dashboard. Staff only.
   */
  export type get_Surveys_results_retrieve = {
    method: 'GET'
    path: '/api/reef/surveys/{id}/results/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { id: number }
    }
    responses: { 200: Record<string, unknown> }
  }
  /**
   * Definition and theme for the runner. Published surveys only; an
   * authenticated-visibility survey requires a signed-in caller.
   */
  export type get_Surveys_definition_retrieve = {
    method: 'GET'
    path: '/api/reef/surveys/{slug}/definition/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { slug: string }
    }
    responses: { 200: Schemas.SurveyDefinition }
  }
  /**
   * Submit a response to a published survey.
   */
  export type post_Surveys_responses_create = {
    method: 'POST'
    path: '/api/reef/surveys/{slug}/responses/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: {
      path: { slug: string }

      body: Schemas.ResponseCreate
    }
    responses: { 201: Schemas.ResponseCreate }
  }
  /**
   * Open surveys Red may offer. Bearer optional: an identified user also
   * receives their targeted surveys, an anonymous caller sees open ones only.
   */
  export type get_Surveys_open_list = {
    method: 'GET'
    path: '/api/reef/surveys/open/'
    requestFormat: 'json'
    responseFormat: 'json'
    parameters: never
    responses: { 200: Array<Schemas.OpenSurvey> }
  }

  // </Endpoints>
}

// <EndpointByMethod>
export type EndpointByMethod = {
  get: {
    '/api/reef/me/documents/': Endpoints.get_Me_documents_retrieve
    '/api/reef/popularity/': Endpoints.get_Popularity_list
    '/api/reef/precomputed/subjects/': Endpoints.get_Precomputed_subject_index_retrieve
    '/api/reef/precomputed/subjects/{slug}/': Endpoints.get_Precomputed_subject_detail_retrieve
    '/api/reef/precomputed/stats/': Endpoints.get_Precomputed_stats_retrieve
    '/api/reef/precomputed/surveys/': Endpoints.get_Precomputed_survey_list_retrieve
    '/api/reef/ratings/{rfc}/': Endpoints.get_Ratings_retrieve
    '/api/reef/schema/': Endpoints.get_Schema_retrieve
    '/api/reef/sets/': Endpoints.get_Sets_list
    '/api/reef/sets/{id}/': Endpoints.get_Sets_retrieve
    '/api/reef/stats/': Endpoints.get_Stats_list
    '/api/reef/subjects/': Endpoints.get_Subjects_list
    '/api/reef/subjects/{slug}/': Endpoints.get_Subjects_retrieve
    '/api/reef/subscriptions/': Endpoints.get_Subscriptions_list
    '/api/reef/surveys/': Endpoints.get_Surveys_list
    '/api/reef/surveys/{id}/': Endpoints.get_Surveys_retrieve
    '/api/reef/surveys/{id}/results/': Endpoints.get_Surveys_results_retrieve
    '/api/reef/surveys/{slug}/definition/': Endpoints.get_Surveys_definition_retrieve
    '/api/reef/surveys/open/': Endpoints.get_Surveys_open_list
  }
  put: {
    '/api/reef/ratings/{rfc}/': Endpoints.put_Ratings_update
    '/api/reef/sets/{id}/': Endpoints.put_Sets_update
    '/api/reef/sets/{id}/documents/{doc}/': Endpoints.put_Sets_documents_update
    '/api/reef/sets/{id}/order/': Endpoints.put_Sets_order_update
    '/api/reef/surveys/{id}/': Endpoints.put_Surveys_update
  }
  delete: {
    '/api/reef/ratings/{rfc}/': Endpoints.delete_Ratings_destroy
    '/api/reef/sets/{id}/': Endpoints.delete_Sets_destroy
    '/api/reef/sets/{id}/documents/{doc}/': Endpoints.delete_Sets_documents_destroy
    '/api/reef/subscriptions/{id}/': Endpoints.delete_Subscriptions_destroy
    '/api/reef/surveys/{id}/': Endpoints.delete_Surveys_destroy
  }
  post: {
    '/api/reef/sets/': Endpoints.post_Sets_create
    '/api/reef/subscriptions/': Endpoints.post_Subscriptions_create
    '/api/reef/surveys/': Endpoints.post_Surveys_create
    '/api/reef/surveys/{slug}/responses/': Endpoints.post_Surveys_responses_create
  }
  patch: {
    '/api/reef/sets/{id}/': Endpoints.patch_Sets_partial_update
    '/api/reef/surveys/{id}/': Endpoints.patch_Surveys_partial_update
  }
}

// </EndpointByMethod>

// <EndpointByMethod.Shorthands>
export type GetEndpoints = EndpointByMethod['get']
export type PutEndpoints = EndpointByMethod['put']
export type DeleteEndpoints = EndpointByMethod['delete']
export type PostEndpoints = EndpointByMethod['post']
export type PatchEndpoints = EndpointByMethod['patch']
// </EndpointByMethod.Shorthands>
