# CHANGE LOG

## RFC Editor.org

### Upcoming API changes

Great care has been taken to ensure consistency with previous API formats where possible. There are substantial unit tests to verify that the same data is being served, except for changes deemed necessary for future compatibility. Developers using rfc-editor.org APIs should read the following document and adjust their code accordingly.

These changes apply to **all** APIs (_global API changes_):

1. **5 digit RFC numbers** (AKA the RFC10k issue). Due to this RFC ids in API responses no longer have leading zeros (eg RFC0500 becomes RFC500), except for DOI ids which remain unchanged. Software parsing should expect 1-5+ digits and not assume that RFCs have 4 digits.
2. **Trailing slash URL changes.** URLs in API responses that link to HTML pages will have trailing slashes (if they didn't already). For example https://www.rfc-editor.org/info/rfc9000 becomes https://www.rfc-editor.org/info/rfc9000/ (note the trailing slash), and https://www.rfc-editor.org/rfc-index.html becomes https://www.rfc-editor.org/rfc-index/ . This has been done for consistency.
3. **Redirects** generally speaking we don't want to change URLs, but if the URL for a resource changes there will be HTTP redirects to the new URL. Consumers of our APIs should ensure their HTTP client is configured to follow redirects. For example, by default `wget` follows redirects but `curl` does not. These redirects _may_ go offsite to another subdomain of `rfc-editor.org`.

#### `/rfc-index.txt`

The global changes, and the table layout of this file must change to make space for 5 digit RFCs. Here's [a sample file of the new `rfc-index.txt` (truncated to RFC19)](https://github.com/ietf-tools/rfced-www/blob/main/website/utilities/rfc-5digit-index.txt) (compare against [the 4 digit](https://github.com/ietf-tools/rfced-www/blob/main/website/utilities/rfc-4digit-index.txt) which has a narrower column). No redirect is expected.

#### `/rfc-index.xml`

The XML was previously 4 digits (with leading zeros as padding), but is now 1-5 digits without leading zeroes. The existing path will be retained. No redirect is expected.

The XML file is validated against the XSD.

#### `/rfc-index.xsd`

The schema previously required 4 digit RFC numbers (with leading zeroes as padding) is [now 1-5 digits without leading zeroes](https://github.com/ietf-tools/red/commit/9464cc948dfeff4dad729ad94ea6d56a75a8a473#diff-75332ae4c2fe619e9f54cd4c16f54ea1a28de7ab6effa8316db35da80eadd186L78). The existing path will be retained. No redirect is expected.

#### `/rfcrss.xml` and `/rfcatom.xml`

The generated feeds aren't identical as the new feed generator uses `<![CDATA[]]>` escaping but compliant RSS/ATOM clients should handle this. For the developer details see [#27](https://github.com/ietf-tools/rfced-www/pull/27). The global API changes apply to this API too. No redirects are expected.

TODO: sample files

#### `/rfc/rfc*.json`

(where \* is a valid RFC number. For example, [rfc9000.json](https://www.rfc-editor.org/rfc/rfc9000.json))

In earlier RFC JSON files (approximately RFC1-RFC4039) there's extra whitespace in earlier RFCs. For example, [rfc10.json](https://www.rfc-editor.org/rfc/rfc10.json) has an extra space character before and after the `title`, `abstract`, and `keywords`. This whitespace wasn't present in equivalent APIs like `/rfc-index.xml`, and this whitespace will be removed in the new version of the API. The global API changes apply to this API too. No redirects are expected for this API.

#### `/errata.json`

Leading zeros in RFC ids will be removed.

This route may redirect to a subdomain of rfc-editor.org. Please ensure your client will follow HTTP redirects.

#### HTML pages

Developers who scrape rfc-editor.org HTML pages should expect a different HTML structure when the new site is released. This is necessary for the new graphic design. No guarantees about maintaining HTML structure can be made and further changes may occur after the release of the site. We recommend that software migrate to JSON or XML APIs instead of scraping HTML as this will be more resilient against these design changes.

##### Pages that will be removed

* `/rfc-index2.html` (RFC index in descending order)
* `/rfc-index-100a.html` and `/rfc-index-100d.html` (a range of RFCs in ascending and descending order respectively)
