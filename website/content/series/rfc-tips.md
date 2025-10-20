---
description: Helpful information about common conventions in RFCs
---

# Tips for Reading RFCs

The RFC Series uses certain conventions that may not be familiar to all readers. Some of the most common are listed here; refer to this more [in-depth overview](https://www.ietf.org/blog/how-read-rfc/) for further information.

## Status

Not all RFCs are standards, so Status is used to indicate the type of RFC. [Statuses may change over time](https://datatracker.ietf.org/doc/statement-iesg-iesg-statement-on-designating-rfcs-as-historic-20140720/).

Standards Track RFCs use the following Statuses:

- **Proposed Standard.** A Proposed Standard specification is generally stable, has resolved known design choices, is believed to be well-understood, has received significant community review, and appears to enjoy enough community interest to be considered valuable. However, further experience might result in a change or even retraction of the specification before it advances.
- **Draft Standard.** An intermediate stage that is no longer used for new standards.
- **Internet Standard.** An Internet Standard is characterized by a high degree of technical maturity and by a generally held belief that the specified protocol or service provides significant benefit to the Internet community.

Other RFC Statuses are:

- **Informational.** An "Informational" specification is published for the general information of the Internet community, and does not represent an Internet community consensus or recommendation. [RFC 2026, Section 4.2.2](/rfc/rfc2026/#section-4.2.2)
- **Experimental.** The "Experimental" designation typically denotes a specification that is part of some research or development effort. Such a specification is published for the general information of the Internet technical community and as an archival record of the work. [RFC 2026, Section 4.2.1](/rfc/rfc2026/#section-4.2.1)
- **Historic**.A specification describing a technology that is no longer in use or no longer recommended for use is assigned the "Historic" Status.
- **Best Current Practice** (BCP). BCPs have a dual role: one is to document IETF processes as agreed by the IETF community, and the other is explained in [RFC 2026, Section 5](/rfc/rfc2026/#section-5) as: "since the Internet itself is composed of networks operated by a great variety of organizations, with diverse goals and rules, good user service requires that the operators and administrators of the Internet follow some common guidelines for policies and operations."
- **Unknown**. RFCs that were published before Statuses were introduced (before RFC 1128\) are mostly considered to have an Unknown Status, with a handful having had Statuses retroactively applied.

## Subseries

There are two subseries within the RFC corpus. Not all RFCs are part of a subseries. Subseries identifiers are intended to be stable identifiers for an RFC or a group of related RFCs. When an RFC is obsoleted, the RFC is dropped from the subseries, but the subseries identifier will remain the same. When a related RFC is published, it may be added to an existing subseries identifier.

- **STD**. STDs are stable identifiers for "Internet Standards." An STD may consist of a single RFC or a group of RFCs related to a specific protocol.
- **BCP**. BCPs are stable identifiers for Best Current Practices. A BCP may consist of a single RFC or a group of RFCs related to a specific IETF process or recommended guidelines.

## Stream

An RFC’s stream indicates which publication stream produced the document. There are five possible streams:

- **The Internet Engineering Task Force** ([IETF](https://www.ietf.org/)) produces protocol standards, best current practices, and informational documents. This is the only stream that creates Internet Standards.
- **The Internet Research Task Force** ([IRTF](https://www.irtf.org/)) focuses on longer term research issues related to the Internet.
- **The Internet Architecture Board** ([IAB](https://www.iab.org/)) provides long-range technical direction for Internet development.
- [**Independent Submissions**](/authors/rfc-independent-submissions/) RFCs are published outside the official processes of the IETF, IAB, and IRTF but are relevant to the Internet community.
- **Editorial** RFCs are produced by the RFC Series Working Group ([RSWG](https://datatracker.ietf.org/group/rswg/about/)) and document the policies for publishing RFCs.

RFCs that were published before any stream existed are given the label "[Legacy]" in place of a stream name.

## Source

An RFC’s source indicates the IETF working group and area that produced the document. A source is only listed for RFCs produced by the IETF Stream, as the other production streams are single source.

## Changes to RFCs

Once an RFC is published, the content of that document doesn’t change. New or updated information is published in new RFCs. When this happens, there will be information in the metadata about where to find these related documents. An RFC’s metadata may contain the following:

- **Updates**: This document contains substantive updates to the RFCs listed here. You may need to read these RFCs to understand this document.
- **Updated By**: This document has been changed by the RFCs listed here. You may need to read these RFCs to understand current practices.
- **Obsoletes**: RFCs listed here are completely replaced by this document. You do not need to read the RFCs listed here to understand current practices.
- **Obsoleted By**: RFCs listed here completely replace this document. In other words, you should not read this document, you should read the RFCs listed here that have obsoleted it.

## Errata

Errata are listed in the Errata section of the sidebar for each RFC when they exist. Errata with a Verified status have been reviewed and are considered accurate (see the [Errata](/series/rfc-errata/) page to learn more). Errata are not incorporated into the TXT, PDF, or XML formats of RFCs. Errata only appear in the display version on this site, or the downloadable HTML version that specifically includes errata.

## Keywords for Requirement Levels

When you see one of the following words in all capital letters in an RFC, it has a special meaning as defined in [RFC 2119](/info/rfc2119/) and updated by [RFC 8174](/rfc/rfc8174/). This only applies when the words are in all capitals.

- **MUST**: This word, or the terms "**REQUIRED**" or "**SHALL**", mean that the definition is an absolute requirement of the specification.
- **MUST NOT**: This phrase, or the phrase "**SHALL NOT**", mean that the definition is an absolute prohibition of the specification.
- **SHOULD**: This word, or the adjective "**RECOMMENDED**", mean that there may exist valid reasons in particular circumstances to ignore a particular item, but the full implications must be understood and carefully weighed before choosing a different course.
- **SHOULD NOT**: This phrase, or the phrase "**NOT RECOMMENDED**" mean that there may exist valid reasons in particular circumstances when the particular behavior is acceptable or even useful, but the full implications should be understood and the case carefully weighed before implementing any behavior described with this label.
- **MAY**: This word, or the adjective "**OPTIONAL**", mean that an item is truly optional.
