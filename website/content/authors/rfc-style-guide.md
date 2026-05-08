# Style Guide

Authoring guidelines can be found on the [Internet-Draft Author Resources](https://authors.ietf.org/) page.

Please see the following for information on RFC style:

- [RFC 7322: "RFC Style Guide"](/info/rfc7322/)
  - [Updates to RFC Style Guide](#updates-to-the-rfc-style-guide)
- [RFC Series Editor statement on authorship](https://mailarchive.ietf.org/arch/msg/rfc-interest/SHM7dHZd_S1a-CkW2JCBvxdKmcs/) (May 2015)
- [Status of This Memo Boilerplate](#rfc-headers-and-boilerplate) – "Status of This Memo" text as defined by [RFC 7841](/info/rfc7841/) and [RFC 9920](/info/rfc9920/) (all permutations of the text are listed [here](/materials/status-memos.txt))
- [Abbreviations List](/rpc/wiki/doku.php?id=abbrev_list) – A non-exhaustive list of expansions of abbreviations (and acronyms) in RFCs
- [Terms List](https://materials.rfc-editor.org/terms-online.txt) – A non-exhaustive list of decisions on consistent usage of terms in RFCs
- [IAB Format](https://wiki.ietf.org/en/group/iab/iab-stream-rfc-format) – IAB-specific formatting information for RFCs from the IAB Stream
- Reference Entries for RFCs – Available in XML (via [BibXML Service](https://bib.ietf.org/)) and [TXT](/in-notes/rfc-ref.txt)
- Reference Entries for STDs and BCPs – Available in [XML](https://bib.ietf.org/indexed-sources/relaton-data-rfcsubseries/) and TXT (for the [STD subseries](/in-notes/std-ref.txt) and the [BCP subseries](/in-notes/bcp-ref.txt) )
- [Guidelines for Writing an IANA Considerations Section in RFCs](/info/rfc8126/)

In general, authors should focus on using clear, concise language in their documents. Read the document aloud, show it to others for input, and revise it as many times as needed to make sure future readers will understand the content.

Additional writing resources that may be helpful to authors:

- [Britannica Dictionary](https://www.learnersdictionary.com/): This dictionary gives more extensive use examples and explanations than typical dictionaries. This can be handy for phrasal verbs, count and noncount nouns, and participles. The site also includes a grammar Q\&A log under the "Ask the Editor" tab.
- [Merriam Webster’s Dictionary](https://www.merriam-webster.com/)
- [The Online Writing Lab (OWL) at Purdue University](https://owl.english.purdue.edu/owl/resource/678/01/): This page contains grammar and mechanics information.
- The [Chicago Manual of Style](https://www.chicagomanualofstyle.com/)
- [The Elements of Style](https://www.bartleby.com/141/)
- [Richard Lanham’s Paramedic Method](https://owl.purdue.edu/owl/general_writing/academic_writing/paramedic_method.html) for information on revising verbose text.

## Updates to the RFC Style Guide

The following style issues have been raised with the RFC Production Center since [RFC 7322, "RFC Style Guide"](/info/rfc7322/) was published. This page reflects current usage. These will be considered for inclusion in a future RFC (current revision draft in [GitHub](https://github.com/rfc-editor/draft-rfc-editor-7322bis)).

Note that a revision draft is in [GitHub](https://github.com/rfc-editor/draft-rfc-editor-7322bis). This page will be updated to reflect current usage.

The RFC Production Center follows these guidelines and will edit and ask questions as needed.

### MUSTs

The following conventions are required in RFCs. Updates will be made to text to follow these guidelines during the editing process. We appreciate compliance in submitted drafts.

#### References

Please refer to [Reference Style Guidance](https://authors.ietf.org/en/reference-style-guidance) for information on constructing references to the following:

 - RFCs
 - STDs and BCPs
 - Errata reports
 - IANA registries
 - Internet-Drafts
 - Web-Based Public Code Repositories (e.g., GitHub)
 - Email or mailing lists

#### Index Placement

If included, an index appears directly before the Authors' Addresses Section.

### RECOMMENDED

The following practices are recommended. Updates may be made to text to follow these guidelines during the editing process.

#### Inclusive Language

Because each stream has chosen to follow the [IESG statement on Inclusive Language](https://www.ietf.org/about/groups/iesg/statements/on-inclusive-language/), the RFC Editor encourages authors to apply the guidance described in ["Guidance for NIST Staff on Using Inclusive Language in Documentary Standards"](https://web.archive.org/web/20250203031433/https://nvlpubs.nist.gov/nistpubs/ir/2021/NIST.IR.8366.pdf). See [Table 1 on the NIST website](https://web.archive.org/web/20250214092458/https://www.nist.gov/nist-research-library/nist-technical-series-publications-author-instructions#table1) for an expanded list of potentially biased language along with possible substitutions.

#### Double Negatives

Double negatives are discouraged.

#### RFC Citations as Compounds

Avoid forming compounds by hyphenating RFC numbers; this can be accomplished by 

- rewording the sentence (e.g., "`[RFC5011]-style rollover`" &rarr; "`rollover as described in RFC 5011 [RFC5011]`").
- adding a note in either the Terminology or Conventions section mentioning the RFC so that other occurrences throughout the text will be understood by the reader to be in the style of said RFC (e.g., "This document uses the term "rollover" as defined in RFC 5011").

#### Abbreviations as Verbs

Avoid using abbreviations as verbs when possible. If unavoidable, suffixes should be affixed without punctuation, for example, "XORed" (not XOR'ed) and "NATed" (not NAT-ed).

#### Expanding Abbreviations upon First Use

Once an abbreviation has been introduced, the abbreviated form should be used thereafter.

#### In-text Citations (bracketed citation)

An in-text citation may a) follow the subject for which it is being cited as a silent pointer to the referenced document or b) be read as part of the text.

**For example:**

a) As part of the transition to IPv6, NAT64 [RFC6146] and DNS64 [RFC6147] technologies will be utilized by some access networks to provide IPv4 connectivity for IPv6-only nodes [RFC6144].

**or**

b) Note that SAVI raises a number of important privacy considerations that are discussed more fully in [RFC6959].

We recommend using a) and strongly recommend consistent use of one style throughout.

#### URIs

HTTPS URIs should be used when possible.

### Author Choice

The following items are left to the authors’ discretion.

#### RFC 2119 Keywords in Quoted Text

A reference is not required if the keywords are only used in quoted text.

#### Terms

You may format terms as you see fit by using capitalization, quotation marks, emphasis, etc. However, consistency within the document and within the Series is strongly recommended.  
Please provide any style guidance to the RFC Production Center when your document enters the queue.

#### Terminology Sections

Terminology sections are recommended for docs that are terminology/abbreviation heavy, but documents should point to existing definitions when possible.

#### Didactic Capitalization

Use of didactic capitalization is not needed.  
**Example:** Extensible Markup Language (XML)  
(not EXtensible Markup Language (XML) or eXtensible Markup Language (XML))

#### Length of Sections

We suggest that the length of a section or subsection be limited to allow for easily referenced objects.

### XML Formatting

The following formatting conventions are to be followed in RFCs.

#### Use of non-ASCII characters

Per RFC 7997, non-ASCII characters may appear within the body of the document. The `<u>` element is required for cases where the non-ASCII characters are needed for correct protocol operation. 

This is in keeping with the following statement (where "escaping" refers to using U+ notation or otherwise defining each character) in [Section 3.1 of RFC 7997](/info/rfc7997/#section-3.1):

"Where the use of non-ASCII characters is purely part of an example  
and not otherwise required for correct protocol operation, escaping  
the non-ASCII character is not required."

Note that ASCII equivalents are to be used for punctuation (e.g., smart quotes and em dashes).

#### Document links

There is no hard limit on the number and frequency of links in documents. However, links introduce noise for people who use screen readers, and this reduces accessibility.

How frequently terms should be linked is circumstantial depending on context and (often) the length of a section and the document. We consider the following when thinking about links:

- The information at other end of a link should be useful to the reader.
- Links should not be self-referential (i.e., links should not link back to its own section/definition)
- Links should not be distracting. At most, link every few paragraphs; perhaps once per section depending the length of the section. Links to the same term should not appear more than once per sentence, bullet, or paragraph. Linking to the same term repetitively frustrates the reader.
- It should be clear to the reader where the link goes (i.e., the link text should be descriptive).

## RFC Headers and Boilerplate

Per [RFC 9920](/info/rfc9920/), the RFC Production Center (RPC) is now maintaining the RFC boilerplates as part of the RFC Style Guide. Therefore, this page provides instructions for constructing header and boilerplate text for RFCs, as specified by [RFC 7841](/info/rfc7841/). The boilerplate may be updated per the process described in [RFC 9920](/info/rfc9920/).

### 1\. RFC Title Page Header

An RFC title page header can be described as follows:

    <document source>                                          <author name>
    Request for Comments: <RFC number>                [<author affiliation>]
    [<subseries ID> <subseries number>]    [more author info as appropriate]
    [<RFC relation>:<RFC number[s]>]                            <month year>
    Category: <category>

For example, a sample earlier RFC header is as follows:

    Network Working Group                                          T. Dierks
    Request for Comments: 4346                                   Independent
    Obsoletes: 2246                                              E. Rescorla
    Category: Standards Track                                     RTFM, Inc.
                                                                  April 2006

### 2\. Constructing a Status of this Memo Section

The following sections describe mandated text for use in specific parts of the Status of this Memo portion of an RFC. For convenience, expansions of all permutations of the paragraphs described in this document and [RFC 9920](/info/rfc9920/) are available; see [status memos](/materials/status-memos.txt). When in conflict, these following sections are authoritative.

### 2.1. First Paragraph

The following is the approved text for use in the first paragraph of the Status of this Memo portion of an RFC (see [Section 3.3 of RFC 7841](/info/rfc7841/#section-3.3)):

**For _Standards Track_ documents:** This is an Internet Standards Track document.

**For _Best Current Practices_ documents:** This memo documents an Internet Best Current Practice.

**For other categories:** This document is not an Internet Standards Track specification; `<it is published for other purposes>`.

For Informational, Experimental, Historic and future categories of RFCs, the RFC editor will maintain an appropriate text for `<it is published for other purposes>`. Initial values are:

**Informational:** it is published for informational purposes.

**Historic:** it is published for the historical record.

**Experimental:** it is published for examination, experimental implementation, and evaluation.

### 2.2. Second Paragraph

The second paragraph may include some text that is specific to the initial document category (see [Section 3.4 of RFC 7841](/info/rfc7841/#section-3.4)).

When a document is Experimental or Historic, the second paragraph opens with:

**Experimental:** This document defines an Experimental Protocol for the Internet community.

**Historic:** This document defines a Historic Document for the Internet community.

The text that follows is stream dependent. Initial values are listed below and may be amended by updates to stream-definition documents. Updates will be recorded on this page.

**IETF Stream:** This document is a product of the Internet Engineering Task Force (IETF).

If there has been an IETF consensus call per IETF process, this additional text should be added:

It represents the consensus of the IETF community. It has received public review and has been approved for publication by the Internet Engineering Steering Group (IESG).

If there has not been such a consensus call, then this simply reads:

It has been approved for publication by the Internet Engineering Steering Group (IESG).

**IAB Stream:** This document is a product of the Internet Architecture Board (IAB), and represents information that the IAB has deemed valuable to provide for permanent record.

If the document represents IAB consensus, this additional text should be added:

It represents the consensus of the Internet Architecture Board (IAB).

**IRTF Stream:** This document is a product of the Internet Research Task Force (IRTF). The IRTF publishes the results of Internet-related research and development activities. These results might not be suitable for deployment.

In addition, a sentence indicating the consensus base within the IRTF may be added:

This RFC represents the consensus of the `<insert_name>` Research Group of the Internet Research Task Force (IRTF).

or alternatively:

This RFC represents the individual opinion(s) of one or more members of the `<insert_name>` Research Group of the Internet Research Task Force (IRTF).

**Independent Submission Stream:** This is a contribution to the RFC Series, independently of any other RFC stream. The RFC Editor has chosen to publish this document at its discretion and makes no statement about its value for implementation or deployment.

**Editorial Stream** (as defined by [Section 6.3 of RFC 9920](/info/rfc9920/#section-6.3)): This document is a product of the RFC Series Policy Definition Process. It represents the consensus of the RFC Series Working Group approved by the RFC Series Approval Board. Such documents are not candidates for any level of Internet Standard; see Section 2 of RFC 7841.

For non-IETF stream documents a reference to [Section 2 of RFC 7841](/info/rfc7841/#section-2) is added with the following sentence:

Documents approved for publication by the stream approver currently, one of: IAB, IRSG, or RFC Editor are not candidates for any level of Internet Standard; see Section 2 of RFC 7841.

For IETF stream documents a similar reference is added:

Further information on [BCPs or Internet Standards] is available in Section 2 of RFC 7841. for BCP and Standard Track documents; Not all documents approved by the IESG are candidates for any level of Internet Standards; see Section 2 of RFC 7841. for all other categories.

### 2.3. Third Paragraph

As defined in [Section 3.5 of RFC 7841](/info/rfc7841/#section-3.5), the third paragraph includes a reference to where further relevant information can be found. The current text is as follows:

Information about the current status of this document, any errata, and how to provide feedback on it may be obtained at `https://www.rfc-editor.org/info/rfcXXXX`.
