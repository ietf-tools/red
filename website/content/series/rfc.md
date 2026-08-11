---
description: An introduction to RFCs, the organizations that produce them, and common conventions in the series
---

# What Is an RFC?

RFCs (Requests for Comments) are documents that describe Internet Standards, technical specifications, protocols, procedures, research, and other information related to the Internet and Internet-connected systems. The RFC Series is the archival publication series for Internet technical specifications and related documents.

The first RFC was written in 1969 by Steve Crocker to organize notes related to the development of ARPANET, which paved the way for the modern Internet. Later RFCs established many of the technical foundations of the Internet itself. Today, people from around the world continue to develop RFCs to document technical work, share information, and standardize Internet technologies.

Not every RFC is an Internet Standard. RFCs can have different statuses and can be published through several different streams. Understanding this information, along with the relationships between RFCs, can help you determine what a particular RFC represents and how it should be read.

Once an RFC is published, its contents do not change. If a specification needs to be changed, the change is published in another RFC. Relationships between RFCs, including updates and obsoletions, are recorded in the RFC metadata. Errata may also be submitted to document errors found after publication.

Anyone is welcome to [participate in the creation of RFCs](https://www.ietf.org/participate/get-started/). You can join a [working group](https://datatracker.ietf.org/wg/) in your area of interest by subscribing to the mailing list, participating in discussions, and contributing to the Internet-Drafts that may one day be published as an RFC.

## How to Read an RFC

RFCs use terminology and conventions that may not be familiar to every reader. Before relying on an RFC, it is useful to look at its metadata as well as the document itself. In particular, you should check its status, publication stream, whether the RFC has been obsoleted or updated, and whether any errata have been reported.

The following sections explain some of the most important information you will encounter when reading an RFC.

### RFC Streams

An RFC's stream identifies the process through which the document was produced. There are five RFC streams:

- **The Internet Engineering Task Force** ([IETF](https://www.ietf.org/)) produces protocol standards, best current practices, and informational documents. This is the only stream that creates Internet Standards.
- **The Internet Research Task Force** ([IRTF](https://www.irtf.org/)) focuses on longer term research issues related to the Internet.
- **The Internet Architecture Board** ([IAB](https://www.iab.org/)) provides long-range technical direction for Internet development.
- [**Independent Submissions**](/authors/rfc-independent-submissions/) RFCs are published outside the official processes of the IETF, IAB, and IRTF but are relevant to the Internet community.
- **Editorial** RFCs are produced by the RFC Series Working Group ([RSWG](https://datatracker.ietf.org/group/rswg/about/)) and document the policies for publishing RFCs.

RFCs that were published before any stream existed are labelled "Legacy Stream" in place of a stream name.

### RFC Status

An RFC's status tells you what kind of document it is. You should not assume that something is an Internet Standard simply because it has been published as an RFC.

An RFC's status can also change over time. See [RFC Status Changes](/status-changes/) for more information.

Standards Track RFCs use the following Statuses:

- **Proposed Standard.** A Proposed Standard specification is generally stable, has resolved known design choices, is believed to be well-understood, has received significant community review, and appears to enjoy enough community interest to be considered valuable. However, further experience might result in a change or even retraction of the specification before it advances.
- **Draft Standard.** An intermediate stage that is no longer used for new standards.
- **Internet Standard.** An Internet Standard is characterized by a high degree of technical maturity and by a generally held belief that the specified protocol or service provides significant benefit to the Internet community.

Other RFC Statuses are:

- **Informational.** An "Informational" specification is published for the general information of the Internet community, and does not represent an Internet community consensus or recommendation. [RFC 2026, Section 4.2.2](/info/rfc2026/#section-4.2.2)
- **Experimental.** The "Experimental" designation typically denotes a specification that is part of some research or development effort. Such a specification is published for the general information of the Internet technical community and as an archival record of the work. [RFC 2026, Section 4.2.1](/info/rfc2026/#section-4.2.1)
- **Historic**.A specification describing a technology that is no longer in use or no longer recommended for use is assigned the "Historic" Status.
- **Best Current Practice** (BCP). BCPs have a dual role: one is to document IETF processes as agreed by the IETF community, and the other is explained in [RFC 2026, Section 5](/info/rfc2026/#section-5) as: "since the Internet itself is composed of networks operated by a great variety of organizations, with diverse goals and rules, good user service requires that the operators and administrators of the Internet follow some common guidelines for policies and operations."
- **Unknown**. RFCs that were published before Statuses were introduced (before RFC 1128\) are mostly considered to have an Unknown Status, with a handful having had Statuses retroactively applied.

### RFC Subseries: STD and BCP

Some RFCs are also assigned identifiers in an RFC subseries. There are two current subseries: **STD** (Internet Standard) and **BCP** (Best Current Practice). Not every RFC belongs to a subseries.

A subseries identifier provides a stable way to identify an Internet Standard or Best Current Practice even when the RFCs that define it change. When an RFC in a subseries is obsoleted, it can be replaced by a newer RFC while the STD or BCP identifier remains the same.

- **STD** identifiers are assigned to Internet Standards. An STD may consist of a single RFC or a group of RFCs that together specify a particular protocol or technology.
- **BCP** identifiers are assigned to Best Current Practices. A BCP may consist of a single RFC or a group of RFCs describing a particular IETF process or set of recommended guidelines.

This means that an STD or BCP number and an RFC number serve different purposes: an RFC number permanently identifies a particular published document, while an STD or BCP identifier can continue to identify a standard or practice as its defining RFCs change.

### RFC Relationships and Changes

RFCs form a large body of related documents, and specifications often develop over time. Because the text of a published RFC never changes, revisions and replacements are published as new RFCs.

You may see the following relationships:

- **Updates:** This RFC makes substantive changes to the RFCs listed here. You may need to read those RFCs along with this one to understand the complete specification.
- **Updated By:** This RFC has been substantively changed by the RFCs listed here. You may need to read the newer RFCs to understand the current specification or practice.
- **Obsoletes:** This RFC replaces the RFCs listed here. The older RFCs remain part of the permanent RFC Series archive, but this RFC should generally be used to understand the current specification or practice.
- **Obsoleted By:** This RFC has been replaced by the RFCs listed here. To understand the current specification or practice, you should generally read the RFCs that obsoleted it.

When you are trying to determine the current specification for a protocol or technology, checking these relationships is an important part of reading an RFC.

### Errata

Errors discovered after an RFC is published are handled through the RFC Series errata process rather than by changing the published RFC.

When an RFC has reported errata, they are listed in the **Errata** section of the sidebar on the RFC's page. Errata with a **Verified** status have been reviewed and determined to be accurate. See the [RFC Errata](/series/rfc-errata/) page for more information about the process.

Errata are not incorporated into the TXT, PDF, or XML versions of an RFC. They appear in the display version on this site and in the downloadable HTML version that specifically includes errata.

If you are using an RFC to implement a protocol or need precise technical information, it is a good idea to check for verified errata.

### Keywords for Requirement Levels

Many RFCs use certain capitalized words to indicate requirement levels. When used as defined by [RFC 2119](/info/rfc2119/) and [RFC 8174](/info/rfc8174/), these words have specific meanings. You will see boilerplate in the text of the RFC when these apply:

- **MUST**: This word, or the terms "**REQUIRED**" or "**SHALL**", mean that the definition is an absolute requirement of the specification.
- **MUST NOT**: This phrase, or the phrase "**SHALL NOT**", mean that the definition is an absolute prohibition of the specification.
- **SHOULD**: This word, or the adjective "**RECOMMENDED**", mean that there may exist valid reasons in particular circumstances to ignore a particular item, but the full implications must be understood and carefully weighed before choosing a different course.
- **SHOULD NOT**: This phrase, or the phrase "**NOT RECOMMENDED**" mean that there may exist valid reasons in particular circumstances when the particular behavior is acceptable or even useful, but the full implications should be understood and the case carefully weighed before implementing any behavior described with this label.
- **MAY**: This word, or the adjective "**OPTIONAL**", mean that an item is truly optional.

## The History of RFCs

RFCs have documented the development of Internet technology since 1969. Because published RFCs are never changed or removed from the series, the collection also provides a permanent historical record of the development of the Internet.

For more about the history of RFCs and the RFC Series, see:

- [RFC Editor History](https://history.rfc-editor.org/)
- RFC 2555: [30 Years of RFCs](/info/rfc2555/)
- RFC 5540: [40 Years of RFCs](/info/rfc5540/)
- RFC 8700: [50 Years of RFCs](/info/rfc8700/)

The official International Standard Serial Number (ISSN) of the RFC Series is **2070-1721**.
