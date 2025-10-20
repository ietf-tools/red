---
showToc: true
---

# Frequently Asked Questions

## The RFC Editor was once Jon Postel; who is it today? {#who}

The RFC Editor is no longer a single person; it is a small group of people. The [IETF Administration LLC (IETF LLC)](https://ietf.org/llc) contracts the RFC Editor function to [Association Management Solutions, LLC (AMS)](https://www.amsl.com). Through 2009, the home of the RFC Editor function was the Networking Division of the [USC Information Sciences Institute (ISI)](https://www.isi.edu) in Marina del Rey, CA. ISI played a key role in the development of the Internet, and Jon Postel was the Director of ISI'S Networking Division for many years. For a historical account of the RFC series, see ["30 Years of RFCs,"](/info/rfc2555/) ["40 Years of RFCs,"](/info/rfc5540/), and ["Fifty Years of RFCs."](/info/rfc8700/)

## Every RFC was attributed to the "Network Working Group" (before the publication of [RFC 5741](/info/rfc5741/)). What working group is that? {#wg}

This label in the heading of RFCs is historical in form and symbolic in content. Historically, "Network Working Group" meant the set of researchers who developed the packet switching protocols for the ARPAnet, beginning in 1969. This label was maintained in RFCs as a reminder of the long and significant technical history that is recorded in the RFC series, and as a reminder that today's technical decisions, wise or not, may be with us for many years. Today, the "Network Working Group" should be interpreted as the set of users, vendors, and researchers who are working to improve and extend the Internet.

## Are all RFCs Internet standards documents? {#allstds}

In a word, **"NO!"**. Many RFCs have Informational or Experimental status and do not represent any kind of standard. They contain information that may be useful or important to retain in this archival document series. This is important to understand, because unscrupulous marketeers and a careless trade press sometimes falsely suggest that every RFC represents a standard, or that all standards have equal weight. The relationship among Internet technical specifications is often complex.

## How can one tell where in the Standards Track an RFC is? {#stdtrack}

Consult the online document ["Internet Official Protocol Standards"](/standards/).

## Can the status of an RFC change after publication? {#statuschanges}

Yes, the status of an RFC can change; this information is available in several locations including the RFC info page and RFC search results. For example, an RFC can be moved from Proposed Standard to Internet Standard (as described in [RFC 6410](/info/rfc6410/)) or from Informational to Historic. For a list of all RFCs that have changed status, please see the [list of status changes](/status-changes/).

## How can I correct an error in a published RFC? {#errata}

You **cannot!** Once an RFC is published, it cannot be changed. The RFCs form an archival series. If the bug represents a change of content, a revised RFC can be written that obsoletes the one in error. For both technical and editorial errors, the RFC Editor provides a list of errata for published RFCs. Use the [RFC Errata page](/series/rfc-errata/) to look up errata by RFC number or view the complete list. Also, search results from the [RFC search page](/search/) include hyperlinks to any corresponding errata entries. To report an error in an RFC, please use the form available from the RFC Errata page (see [How to Report Errata](/series/rfc-errata/#how-to-report-an-erratum) for details).

For RFCs that have verified technical errata, there are files available with the errata shown inline (when possible). They are listed as "HTML with inline errata" in the RFC search results and info pages. For example:  
[RFC 5234](/rfc/inline-errata/rfc5234/).

## May I reproduce or translate an RFC? {#copyright}

All RFCs may be freely reproduced and translated (unmodified). Since the publication of [RFC 5377](/info/rfc5377/) and [RFC 5378](/info/rfc5378/) in November 2008, the copyright notice and legends that appear in RFCs have been determined by the [IETF Trust Legal Provisions](https://trustee.ietf.org/license-info/). See the [IETF Trust Copyright FAQ](https://trustee.ietf.org/about/faq/#copyright) for further information.

## How are the document streams related to the categories? {#streamcat}

While information on which streams can publish in which category is recorded in various RFCs (see RFCs [4844](/info/rfc4844/), [4845](/info/rfc4845/), and [5742](/info/rfc5742/)), a summary is captured here to make the information viewable at a glance. As always, the canonical information is in the RFCs.

| Document Stream | Standards Track\* | Best Current Practice (BCP) | Experimental | Informational | Historic |
| --------------- | ----------------- | --------------------------- | ------------ | ------------- | -------- |
| IETF            | X                 | X                           | X            | X             | X        |
| IRTF            |                   |                             | X            | X             | X        |
| IAB             |                   | X                           | X            | X             | X        |
| Independent     |                   |                             | X            | X             | X        |

\* including Internet Standard (STD) and Proposed Standard

## Who are the stream managers? {#streamman}

As defined in [RFC 4844](/info/rfc4844/), the RFC Editor publishes documents from 4 streams. These are:

| Stream                  | Stream Manager |
| ----------------------- | -------------- |
| IAB                     | IAB Chair      |
| IETF                    | IESG           |
| Independent Submissions | ISE            |
| IRTF                    | IRSG           |

## Can I be notified when a new RFC is published? {#notified}

Yes. An announcement of each new RFC is sent to all members of the rfc-dist mailing list. You can subscribe and unsubscribe from this list at [https://mailman.rfc-editor.org/mailman/listinfo/rfc-dist](https://mailman.rfc-editor.org/mailman/listinfo/rfc-dist). There's also an [RSS feed](/rfcrss.xml) and [Atom feed](/rfcatom.xml).

## I cannot retrieve the text of an RFC. Why not? {#retrieve}

There is a [list](/never-issued/) of RFC numbers that were issued to documents that were never actually published. This explains the occasional gap between numbers. The current procedures are set up to try very hard to avoid this situation in the future. In particular, RFC numbers are never reserved; rather, they are assigned at the last moment in the editorial process.

In addition, some RFCs prior to 800 existed only on paper. The RFC Editor has an ["RFC Online"](https://dashboard.rfc-editor.org/old/rfc-online-2008.html) project to make the entire RFC series available online. However, this process has necessarily had lower priority than editing new RFCs. We are grateful for the help of volunteers in the Internet community who entered and nroffed text of the missing online RFCs.

## When I retrieve an RFC, every line ends in "^M". What gives? {#controlM}

See ["The End-of-Line Story"](https://dashboard.rfc-editor.org/old/EOLstory.txt) for a historical account of the problem and possible solutions.

## Can I get a hard copy of the RFCs? {#hardcopy}

The RFC Editor does not publish the repository in hard copy. There are several reasons for this. First, with over eight thousand RFCs the size of a hard copy would fill several bookcases. Second, given that most of the community obtains electronic versions of these documents, there is insufficient market to justify the printing costs. Finally, the RFC repository is constantly being extended. Any printed version would be quickly out of date.

## How do I get an RFC published? {#how}

See [the RFC publication process](/authors/rfc-edit/).

## Once my document has been sent to the IESG for review, or approved by the IESG for publication, how do I know the RFC Editor has it in their queue? {#in-queue}

Please look at the [RFC Editor Queue](/authors/rfc-edit/pub-queue/).

## How long does it take for a document to become an RFC? {#howlong}

Typical time to publish is 1-2 months, but the actual time varies greatly from one RFC to another. Publication may be held up for a variety of reasons, including IESG approval, inconsistencies or omissions that show up in editing, or normative references to other documents that must be published earlier or simultaneously. (For current information on documents linked by normative references, see the [cluster page](/all_clusters/).) Authors should also be aware that the RFC Queue may be congested right before meetings of the IETF.

## Can I reserve an RFC number? {#reservednumber}

No, reserving an RFC number is not an option. The RFC number assigned to a given document is released when the document moves to AUTH48 state. For further information as to why this policy was adopted, please see [I cannot retrieve the text of an RFC. Why not?](#retrieve)

## What can I do to expedite the RFC publication process? {#expedite}

If expedited publication is needed (including release of an RFC number only) to coordinate publication with other standards development organizations (SDOs), contact your stream manager. They may request that your document be prioritized. A number will be released when AUTH48 is initiated. Please be sure to notify the RPC of the date by which the RFC number is needed.

## I just realized my document has typos, or my address or affiliation has changed. What do I do? {#typos}

If your document is in the [RFC Editor Queue](/authors/rfc-edit/pub-queue/), please go ahead and send the changes to the [RFC Editor](mailto:rfc-editor@rfc-editor.org) at any time.

## What style guide does the RFC Editor use? {#style}

See the [RFC Style Guide](/authors/rfc-style-guide/). Also, we generally refer to ["The Chicago Manual"](https://www.chicagomanualofstyle.org/home.html).

## How should RFCs be listed in the references section? {#refs}

References to RFCs should appear as described in the [Online Portion of the RFC Editor Style Guide](/authors/rfc-style-guide/); see "Referencing RFCs".

We recommend using these files for referencing RFCs:  
XML: via [BibXML Service](https://bib.ietf.org) (e.g., [https://bib.ietf.org/public/rfc/bibxml/reference.RFC.5234.xml](https://bib.ietf.org/public/rfc/bibxml/reference.RFC.5234.xml))  
TXT: [https://www.rfc-editor.org/in-notes/rfc-ref.txt](https://www.rfc-editor.org/in-notes/rfc-ref.txt)

Representative reference tags (such as \[RFC2119\]) are preferred over numeric reference tags (such as \[1\]).

## How should Internet-Drafts be listed in the references section? {#IDrefs}

References to I-Ds should appear as described in  
[Section 4.8.6.3 of the intended update to RFC Style Guide.](https://datatracker.ietf.org/doc/html/draft-flanagan-7322bis-05#section-4.8.6.3)

We recommend using the XML citation library; the URLs are of the form https://datatracker.ietf.org/doc/bibxml3/reference.I-D.foo.xml. For example:  
`<xi:include href="https://datatracker.ietf.org/doc/bibxml3/draft-ietf-mmusic-msrp-usage-data-channel.xml">`

xml2rfc will reference the most current version of the I-D when this format is used. If a reference to a specific version of the I-D is desired, included the version number as part of the URL.

## Will I have a chance to look over my document before it becomes an RFC? {#lastlook}

Yes, during AUTH48 state. See [Publication Process](/authors/rfc-edit/) and [Authors' Final Review (AUTH48)](/authors/rfc-edit/auth48/).

## One of the authors is no longer available; how do we proceed? {#missingauthor}

We recommend one of the following paths:

1.  The author can be removed as an author and moved to the Acknowledgements section.
2.  The author can be removed as an author and moved to the Contributors section.
3.  A stream manager can approve the document in place of the unavailable author. (See the [IESG Statement on AUTH48 State](https://www.ietf.org/iesg/statement/auth48.html).)

Option 3 is typically used in instances where the missing author made significant contributions to the document, so the other authors are not comfortable removing the individual from the author list.

## After an Internet-Draft from a working group is approved for publication as an RFC, how are the WG chairs and Area Directors involved in the publication process? {#involved}

The WG chairs and Area Directors are CC'ed on every message sent from the RFC Editor to the authors during the course of the publication process, so they have the option of giving input at any time. Specifically, Area Director approval is requested when any changes that are beyond editorial are introduced into the document. A reply from WG chairs may be sought for issues that affect more than one document from their WG or for decisions about whether the WG needs to review changes.

The Document Shepherd (when not one of the WG chairs) is also CC'ed on each message from the RFC Editor during the publication process.

After the RFC is published, the authors as well as the WG chairs and Area Directors receive the notification message if [errata](https://errata.rfc-editor.org) are reported for that RFC.

## What if I want to include diagrams in an RFC that cannot be rendered in ASCII? {#enhanced}

You can use SVG; please see [How do I include SVG in my document?](https://materials.rfc-editor.org/FAQ-xml2rfcv3.html#name-how-do-i-include-svg-in-my-).

For background, before the transition to v3 XML, there was an option to post a PDF with enhanced images after the ASCII text was published. It would contain the exact text of the RFC with diagrams added. This file was produced by the authors. Since 16 September 2020, authors may no longer submit enhanced PDF files, as they can use SVG to create their figures in the RFC.

Note that the enhanced PDF files posted before that date are still available. Examples of RFCs that have used this option are [RFC 4128](/info/rfc4128/), [RFC 4137](/info/rfc4137/), [RFC 4601](/info/rfc4601/), [RFC 5059](/info/rfc5059/), [RFC 5317](/info/rfc5317/), and [RFC 5598](/info/rfc5598/). The optional PDF is listed as "PDF with images".

## How do I get the source file to write a "bis" document (a document that will obsolete an existing RFC)? {#sourcefile}

For a recent source file (RFC 8650 and onwards), please retrieve it from [https://www.rfc-editor.org/in-notes/prerelease/](/in-notes/prerelease/). This is the ["not prepped" XML source file](#notprepped), best for continued editing.

For numbers below RFC 8650, source files (XML or NROFF) are available by request; please send mail to the [RFC Editor](mailto:rfc-editor@rfc-editor.org).

## What is the "not prepped" XML file? {#notprepped}

It's the file before the prep tool defined in [RFC 7998](/info/rfc7998/) is run. Before we publish the source file of an RFC, we use the xml2rfc tool to do a process called "preparing" the XML. This fills in defaults, adds explicit section numbers, and adds other data (including any external content) to make it easier to render the XML consistently into other formats. While the prepped XML is ideal for rendering, it is far from ideal for editing, since section numbers can change as text is added or reordered, and all of the default values can make it hard to find the useful XML elements and attributes.

## How can I submit an April 1st RFC? {#april}

April 1st submissions are the only RFCs-to-be that do not need to be posted as Internet-Drafts. These entries should be sent directly to the [RFC Editor](mailto:rfc-editor@rfc-editor.org). We appreciate receiving all entries at least 2 weeks prior to April 1st so that the RFC Editor team has time to review all of the documents and prepare those that we decide to publish.

## How does AUTH48 work? {#process}

See the instructions for completing AUTH48 [here](/authors/rfc-edit/auth48/).

## You sent me the URL for my XML file, but I can't view the XML file in my browser. How do I retrieve it? {#xmlfile}

In the browser, there are several options to save the XML file. Please use "view page source" (or similar) and save the file.

### You sent me the URL for my XML file, but I'm getting a 404 Not Found error message. How do I retrieve it? {#a404xml}

Please send mail to [the RFC Editor](mailto:rfc-editor@rfc-editor.org), as the file may not have been posted correctly.

## Which file should I use to make updates myself and to send back to the RFC Editor? {#whichsource}

Please use the edited XML file, which is available here (as noted in the AUTH48 notification message):

https://www.rfc-editor.org/authors/rfcXXXXX.xml where XXXXX is the number of the RFC.

Note: If there are questions included within the XML file, you do not need to reply in both the XML file and the email. Replying in either form is sufficient. Please see [the AUTH48 notice](/authors/rfc-edit/auth48/) for more information.

## When can I send my changes? {#changes}

If your document is in AUTH48, send your changes as soon as possible. This is your last chance to make changes; once the document is published as an RFC, we will not make changes.

## Can you change the placement of the page breaks? {#pagebreaks}

In the v3 format, no, we cannot generally change the placement of the page breaks (which only appear in the PDF output).

## Who needs to approve the document? {#approval}

Each of the authors listed in the first-page header must approve the document before it can be published as an RFC. Note that those listed in the document header are responsible for reviewing and approving the RFC-to-be for publication. As part of that, they are also responsible for engaging other parties (e.g., Contributors or Working Group) as necessary before providing their approval. In addition, the RFC Editor requires stream manager approval for any changes that seem beyond editorial in nature. See [information about stream managers](#streamman) above. You can track the progress of approvals on the AUTH48 page at the following location:

https://www.rfc-editor.org/auth48/rfcXXXX/ where XXXX is the assigned RFC number.

Note: Before or after your approval of the document as a whole, there may be changes sent by your coauthors. Assuming you have already sent us your approval of the document, it still stands unless you notify us otherwise. Any changes that are beyond editorial will be sent to the relevant body for approval.

## What do we do if one of the authors is unavailable? {#missingauthor20}

This is the same as the topic [described above](#missingauthor).

## Why does the stream manager need to approve the changes? {#streammanagers}

We will ask a stream manager to review and approve any changes that seem beyond editorial in nature, e.g., addition of new text, deletion of text, and technical changes. See [information about stream managers](#streamman) above. Editorial changes do not require approval from a stream manager.

## I changed my affiliation after this document was edited. Should I use my new or old affiliation for this document? {#affiliation}

We require a working and long-lived email address, but updating the rest of your contact information is up to you. We prefer up-to-date contact information, but we understand that authors sometimes need to credit the employer that supported their work on the document. A few options (in no particular order) that may work here:

- No change to your contact information (if it includes a long-lived and working email address).
- Completely update your contact information (no mention of your previous employer).
- Completely update your contact information, and include an acknowledgement to thank the organization that supported your work on the document. For example, see [RFC 6113](/info/rfc6113/).

## How does the IANA get notified of any changes to the descriptions of values being registered by this document, and how do they know when to update the reference to point to the published RFC? {#iana}

Once we have approvals from each of the authors, we will begin the publication process. The RFC Editor will notify the IANA that the RFC has been published and what the assigned RFC number is. The references will be updated to reflect the new RFC number shortly after the notification has been sent (usually a few business days).

## Why did you change "which" to "that"? {#whichthat}

"Which" clauses are nonrestrictive (nonessential to the sentence) and add something about an item already identified, while "that" clauses are restrictive (essential to the sentence) and narrow a category or identify a particular item being talked about. For example:

- (non-restrictive "which": all RST attacks rely on brute-force): It should be noted that RST attacks, which rely on brute-force, are relatively easy to detect at the TCP layer.
- (restrictive "that": only _some_ RST attacks rely on brute-force): It should be noted that RST attacks that rely on brute-force are relatively easy to detect at the TCP layer.

## I used British English. Why did you change it to American English? {#british}

If there is a mix of British and American English within the Internet-Draft, the document is updated to use American English for consistency, as noted in Section 3.1 of [RFC 7322](/info/rfc7322/).
