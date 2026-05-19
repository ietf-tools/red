# CHANGE LOG

## RFC Editor.org

### Upcoming API changes

Great care has been taken to ensure consistency with previous API formats where possible. There are substantial unit tests to verify that the same data is being served, except for changes deemed necessary for future compatibility. Developers using rfc-editor.org APIs should read the following document and adjust their code accordingly.

These changes apply to **all** APIs (_global API changes_):

1. **5 digit RFC numbers** (AKA the RFC10k issue). Due to this RFC ids in API responses no longer have leading zeros (eg RFC0500 becomes RFC500), except for DOI ids which remain unchanged. Software parsing should expect 1-5+ digits and not assume that RFCs have 4 digits.
2. **Trailing slash URL changes.** URLs in API responses that link to HTML pages will have trailing slashes (if they didn't already). For example https://www.rfc-editor.org/info/rfc9000 becomes https://www.rfc-editor.org/info/rfc9000/ (note the trailing slash). This has been done for consistency.
3. **Redirects** generally speaking we don't want to change URLs, but if the URL for a resource changes there will be HTTP redirects to the new URL. Consumers of our APIs should ensure their HTTP client is configured to follow redirects. For example, by default `wget` follows redirects but `curl` does not. These redirects _may_ go offsite to another subdomain of `rfc-editor.org` eg `/queue2.xml` may redirect to `queue.rfc-editor.org/queue.xml`.

#### `/rfc-index.txt`

The global changes, and the table layout of this file must change to make space for 5 digit RFCs. No redirect is expected.

#### `/rfc-index.xml`

The XML was previously 4 digits (with leading zeros as padding), but is now 1-5+ digits without leading zeroes. The existing path will be retained. No redirect is expected.

The XML file is validated against the XSD.

#### `/rfc-index.xsd`

The schema previously required 4 digit RFC numbers (with leading zeroes as padding) is [now 1-5+ digits without leading zeroes](https://github.com/ietf-tools/red/commit/9464cc948dfeff4dad729ad94ea6d56a75a8a473#diff-75332ae4c2fe619e9f54cd4c16f54ea1a28de7ab6effa8316db35da80eadd186L78). The existing path will be retained. No redirect is expected.

#### `/rfcrss.xml` and `/rfcatom.xml`

The generated feeds aren't identical as the new feed generator uses `<![CDATA[]]>` escaping but compliant RSS/ATOM clients should handle this. For the developer details see [#27](https://github.com/ietf-tools/rfced-www/pull/27). The global API changes apply to this API too. No redirects are expected.

#### `/rfc/rfc*.json`

(where \* is a valid RFC number. For example, [rfc9000.json](https://www.rfc-editor.org/rfc/rfc9000.json))

In earlier RFC JSON files (approximately RFC1-RFC4039) there's extra whitespace in earlier RFCs. For example, [rfc10.json](https://www.rfc-editor.org/rfc/rfc10.json) has an extra space character before and after the `title`, `abstract`, and `keywords`. This whitespace wasn't present in equivalent APIs like `/rfc-index.xml`, and this whitespace will be removed in the new version of the API. The global API changes apply to this API too. No redirects are expected for this API.

#### `/errata.json`

Leading zeros in RFC ids will be removed.

This route may redirect to a subdomain of rfc-editor.org. Please ensure your client will follow HTTP redirects.

#### `/queue.xml` and `/queue2.xml`

These routes will redirect to a subdomain of rfc-editor.org such as queue.rfc-editor.org. Please ensure your client will follow HTTP redirects.

These routes will redirect to the same URL, as we're consolidating the feeds into a single feed file.

This new file is based on the format of `queue2.xml` but the path will be called `queue.xml`.

Here is [the `queue.xml` schema named `queue.xsd`](https://raw.githubusercontent.com/ietf-tools/queue/cd4ad57253d264ede05a073cf4a27c38f4d9f97b/precomputer/src/utils/queue.xsd).

Notable changes:

- Leading zeros in RFC ids will be removed.
- `<section>` element `xml:id` attribute renamed `id`.

#### `/in-notes/tar/*.tar.gz` and `/in-notes/tar/*.zip`

These files will no longer be served. Instead, use rsync.

#### `/ref/*`

These txt files were previously 4 digits (with leading zeros as padding), but are now 1-5+ digits without leading zeroes. The existing path will be retained. No redirect is expected.

Any URL references in the txt file may have trailing slashes `/` added.

#### `/rfc/*`

The HTML in these routes should not change as a result of the new site.

Please open an Issue if you find a difference.

#### HTML pages (homepage, docs pages, `/info/*` routes)

Developers who scrape rfc-editor.org HTML pages should expect a different HTML structure when the new site is released. This is necessary for many reasons. No guarantees about maintaining HTML structure can be made and further changes may occur after the release of the site. We recommend that software migrate to JSON or XML APIs instead of scraping HTML as this will be more resilient against these design changes.

Bookmarked links to pages no longer found should redirect to the new URL. File an Issue if you found that we've missed one, and feel free to check `worker/src/index.ts` for redirect rules.

##### HTML search pages like `/search/rfc_search_detail.php`, `/search/errata_search.php`, `/search/rfc_search.php`

These routes were HTML and aren't considered to be APIs (in the sense that there's no effort to maintain HTML structure). Any software scraping from these routes will have to update to the new search page which uses JavaScript and API JSON results (ie, the search results aren't even in the HTML response, it's a JavaScript app).

For bookmarked links to the previous search there are redirects. Best attempts have been made to preserve the search query's meaning and redirect to the new search engine with those query parameters converted into what the new search page expects. Sometimes no conversion is available, due to a mismatch of features between the previous search engine and the new. No guarantees are made about a perfect conversion, but if you there is a better conversion please report an issue.

This is a new search engine and it could have different search results, compared to the previous one.

#### Pages/routes that will be removed

- `/rfc-index.html` (RFC index in ascending order). Instead use the search.
- `/rfc-index2.html` (RFC index in descending order). Instead use the search.
- `/rfc-index-100a.html` and `/rfc-index-100d.html` (a range of RFCs in ascending and descending order respectively)
- `/in-notes/tar/*.tar.gz` and `/in-notes/tar/*.zip`
