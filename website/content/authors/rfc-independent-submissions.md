---
description: Other issues relevant to the Internet community
---

# Independent Submissions

The Independent Submission Stream allows RFC publication for some documents that are outside the official processes of the [IETF](https://www.ietf.org/), [IAB](https://www.iab.com/), and [IRTF](https://www.irtf.org/) but are relevant to the Internet community and achieve reasonable levels of technical and editorial quality. [RFC 8730, "Independent Submission Editor Model"](/info/rfc8730/), as updated by [RFC 9280](/info/rfc9280/), describes the roles of

- the Independent Submissions Editor (ISE) and
- the [Independent Submissions Editorial Board](#independent-submissions-editorial-board), which provides review for the ISE.

The Independent Submissions Editor (ISE) is currently [Eliot Lear](https://datatracker.ietf.org/person/lear@lear.ch), who can be reached at [rfc-ise@rfc-editor.org](mailto:rfc-ise@rfc-editor.org).

## Submission

To be considered for publishing as an RFC, a document must first be posted online as an Internet-Draft. (The exception is a document that is submitted for consideration as an [April 1st RFC](/series/rfc-faq/). See [I-D Author Resources](https://authors.ietf.org/) for guidance on posting an Internet-Draft.

After posting the document as an Internet-Draft, the author should send an email message to the ISE: [rfc-ise@rfc-editor.org](mailto:rfc-ise@rfc-editor.org). This message should include the following information:

- The file name of the published Internet-Draft that is being submitted.
- The desired category (Informational or Experimental).
- A summary of related discussion of this document, if any, that has occurred in an IETF working group or in the IESG.
- An assertion that no IANA allocation in the document requires IETF Review or Standards Action. See [RFC 8126](/info/rfc8126/) for a definition of these terms and [RFC 8726](/info/rfc8726/) for more information about how IANA requests are handled for Independent Submission Stream documents.
- A statement describing the purpose, intended audience, merits, and significance of the document.
- Suggestions for one or more competent and independent potential reviewers for the document, including contact information. This can speed the review and approval process.

The ISE uses the [IETF Datatracker](https://datatracker.ietf.org/) through all stages of Independent Submission Stream document handling. The Datatracker page for a given draft shows its ISE state. [RFC 6322](/info/rfc6322/) provides descriptions of these states. In addition, a complete list showing the ISE state for all documents in the Independent Submission Stream is available [here](https://datatracker.ietf.org/stream/ise/).

The procedures and requirements for handling rights (including copyright and IPR) in the Independent Submission Stream are documented in [RFC 5744](/info/rfc5744/).

## Document Reviews

The ISE may make general and/or specific suggestions to the author(s) about improvements in the editorial quality of the document or violations of the format and content rules. As with other streams in the RFC Series, documents in the Independent Submission Stream should follow the [NIST guidance](https://www.nist.gov/nist-research-library/nist-technical-series-publications-author-instructions#inclusive) for the use of inclusive language. The author(s) will be expected to make the suggested updates, submit a new version, and inform the ISE.

Each independent submission will receive at least one review, under the [reviewer guidelines](/materials/reviewer.guide.txt). Reviewers may be members of the [Independent Submissions Editorial Board (ISEB)](#independent-submissions-editorial-board) or some person known to the ISE or the ISEB to be competent in the subject of the document. Results of the review(s), including editorial and content problems, will be returned to the document author(s) and perhaps shared with the ISEB.

An independent submission that contains material outside the (rather broad) scope of the RFC Series (for example, it must be somehow related to the Internet) or that contains excessively bad writing will be rejected. The ISE generally applies a liberal standard if a document is at all relevant and interesting to some potential readers. In most cases, the ISE will request that the author(s) revise and resubmit their document.

General rules for independent submissions are found in [RFC 4846](/info/rfc4846/). The details of the review procedures in that document are approximately defined by the [state diagram](/materials/ISRstates.txt) and a [detailed explanation of states](/materials/explain_indsub_states.txt) for the pre-publication review process.

## IESG Process Review

As a document progresses through the independent submission process, the IESG will consider whether it conflicts with the IETF standards process; see [RFC 5742](/info/rfc5742/) for details. The IESG makes a recommendation to the ISE.

Documents submitted independently are sometimes remanded to an IETF working group that is already working on the same subject; in these cases, the author will be asked to work within the IETF to develop the document, and it will be removed from the Independent Submission Stream.

The IESG may recommend that the document not be published or that publication be delayed ([RFC 5742](/info/rfc5742/)). In these cases, the ISE will weigh carefully the IESG’s recommendation against other considerations and make a final decision.

## Conflict of Interest Policy

From time to time, the Independent Submissions Editor may have a conflict of interest, or the appearance of a conflict of interest, with regard to a particular draft. This can occur for a number of reasons, including when submissions are received from people who are employed by the ISE’s employer or its competitors. Such relationships in and of themselves may not lead to variance in the editorial process, but they must be disclosed.

When the ISE believes that there may be a conflict of interest, or if authors or others believe that there is a conflict of interest, the matter will be referred to the [Independent Submissions Editorial Board](#independent-submissions-editorial-board). They will advise the ISE as to what should happen at the various stages of the publication process. The ISE will inform the community and authors of such conflicts, and any actions to be taken as a result.

## Independent Submissions Editorial Board

The Independent Submissions Editorial Board (ISEB) provides reviews of independent submissions and offers advice to the Independent Submissions Editor (ISE). The ISEB can be reached at rfc-ed-board@rfc-editor.org.

The present board includes (in alphabetical order):

- Harald Alvestrand
- Scott Bradner
- Nevil Brownlee
- Richard Clayton
- Aaron Falk
- Adrian Farrel
- Stephen Farrell
- Sharon Goldberg
- Joel Halpern
- Sue Hares
- John Klensin
- Subramanian Moonesamy (SM)
- Kathleen Moriarty
- Craig Partridge
- Martin Thomson

## An Overview of Publishing RFCs via the Independent Submissions Process

### Introduction

Not all RFCs are published through the [IETF](https://ietf.org/). Some are published as independent submissions. These documents do not require, nor do they carry, community consensus, and they are not standards or best practices.  
![A description of the different streams that feed into the RFC series.  Once initially approved for publication, they are processed by the RFC Production Center, and then go on to be published.](/images/authors/rfc-independent-submissions-streams.png)

- [What sort of documents are independent submissions?](#what-sort-of-documents-are-independent-submissions)
- [What are some examples of RFCs published through the Independent Stream that hit at least one of those points?](#what-are-some-examples-of-rfcs-published-through-the-independent-stream-that-hit-at-least-one-of-those-points)
- [What other criteria are there for Independent Stream RFCs?](#what-other-criteria-are-there-for-independent-stream-rfcs)
- [What if a document isn’t appropriate as an independent submission?](#what-if-a-document-isnt-appropriate-as-an-independent-submission)
- [What about Intellectual Property Rights (IPR)?](#what-about-intellectual-property-rights-ipr)
- [What’s the process?](#whats-the-process)
- [At what stage is a document?](#at-what-stage-is-a-document)
- [Who makes decisions about independent submissions?](#who-makes-decisions-about-independent-submissions)
- [Who reviews submissions?](#who-reviews-submissions)
- [Where can reviews be found?](#where-can-reviews-be-found)
- [What is IETF Conflict Review?](#what-is-ietf-conflict-review)
- [How is a decision made?](#how-is-a-decision-made)
- [What happens if a work is declined?](#what-happens-if-a-work-is-declined)
- [Can an Independent Submission be changed once it is published as an RFC?](#can-an-independent-submission-be-changed-once-it-is-published-as-an-rfc)
- [More questions?](#more-questions)

#### What sort of documents are independent submissions?

The Independent Stream covers a number of classes of submissions, including discussions of technologies, options, or experience with protocols; humor; documentation of vendor-specific protocols; introduction of new ideas that may not yet be ripe for standardization; critiques of the IETF process; and a few other areas.

The current independent submissions editor looks at a document through the lens of three questions:

1. Does this specification improve interoperability?
2. Does this document contribute to continuous improvement of the Internet?
3. Does this document provide the community some levity?

Not every submission needs to hit all three points.

#### What are some examples of RFCs published through the Independent Stream that hit at least one of those points?

- [RFC 9446](/rfc/rfc9446/) provides us a retrospective on ten years after the Snowden revelations, how the community reacted, what was accomplished, and what could be done better.
- [RFC 9518](/rfc/rfc9518/) talks about Internet centralization, its impact, and what, if anything, can be done about it.
- [RFC 9405](/rfc/rfc9405/) discusses sarcasm in AI systems, and was written in part by ChatGPT.
- [RFC 9383](/rfc/rfc9383/) specifies the SPAKE2+ augmented password-authenticated key exchange (PAKE) protocol.

#### What other criteria are there for Independent Stream RFCs?

Documents must be well written, understandable, and appropriate for the readership of the RFC series. They must adhere to any [IANA](https://iana.org/) rules for code point allocation, and in general may not create new IANA registries. Internal implementation descriptions are generally not accepted, nor are foundational formats upon which standards are expected to be built.

#### What if a document isn’t appropriate as an independent submission?

If a document is not appropriate as an independent submission, the Independent Submissions Editor will attempt to assist the authors to find a more appropriate home. That could be the IETF, the [IRTF](https://irtf.org/), some other standards organization, a blog, or an academic publication. The criteria to be applied is simple: what would best serve the community?

#### What about Intellectual Property Rights (IPR)?

An independent RFC should generally provide an open license to implement and deploy some or all of the technology described in the document; text from that document is available to be reused for any purpose.

#### What’s the process?

![The publication pipeline: steps include submission, initial evaluation, document updates, commissioned reviews, ISE review, more document updates, IESG conflict review, more document updates, publication request, to the RPC and final edits (AUTH48).](/images/authors/rfc-independent-submissions-process.png)
Everything begins with an Internet-Draft. You can use the same tooling that is used by the IETF to create and publish it onto the Datatracker. See [authors.ietf.org](https://authors.ietf.org) for more information about authoring tools.  
The rest of the process is summarized as follows:

1. Submit a draft
2. Fill out the independent submissions template found at the top of this page
3. Submit the template to the Independent Submissions Editor
4. Initial ISE review
5. Commissioned reviews
6. Follow-up ISE review
7. IETF Conflict Review
8. Follow-up ISE review
9. Initial publication decision
10. Submission to the RFC Production Center (RPC)
11. AUTH48
12. Publication

It’s important to note that many drafts do not make it past Step 4, and that every step after submission may be iterated or repeated. For instance, if external review indicates that substantial amounts of work are needed, authors are expected to improve the document in discussions with reviewers and the Independent Submissions Editor.

#### At what stage is a document?

Information about the current state of an independent submission can be found on the [Datatracker](https://datatracker.ietf.org/) page for that draft.  
![Snapshot of a Datatracker entry for an Internet-Draft that shows the document’s state.](/images/authors/rfc-independent-submissions-snapshot.png)
Note that a document can sometimes appear to go "backwards" in the process. This is not unusual, indicating that either additional reviews require more work on someone’s part.

#### Who makes decisions about independent submissions?

The Independent Submissions Editor is responsible for making decisions about each submission, in accordance with the guidance set forth in [RFC 4846](/rfc/rfc4846/). The Independent Submissions Editor is appointed by the [Internet Architecture Board (IAB)](https://iab.org/), and serves at their pleasure. Anyone may send comments to the IAB about the Independent Submissions Editor.

The Independent Submissions Editor is ably assisted by the Independent Submissions Editorial Board, who also sometimes perform document reviews.

#### Who reviews submissions?

The Independent Submissions Editor seeks review of the work through individuals who are knowledgeable about the topic discussed in the draft. Authors are encouraged to submit suggestions, but some reviews will be conducted outside of that list. In addition, anyone is welcome to comment on a draft that is being considered by the Independent Submissions Editor.

#### Where can reviews be found?

![Snapshot of the Datatracker entry for a draft that shows reviews.](/images/authors/rfc-independent-submissions-reviews.png)
Unless they have been submitted anonymously, reviews will be found on the Datatracker page associated with your draft.

#### What is IETF Conflict Review?

In general, submissions should not conflict with IETF work or established best practices. [RFC 5742](/rfc/rfc5742/) provides the Internet Engineering Steering Group (IESG) the opportunity to comment about whether this is the case. Most of the time a document will not get to the stage of the IESG even being consulted if such a conflict is likely. If the IESG determines that there is a conflict of some form, the ISE will attempt to work with authors and the IESG to resolve it satisfactorily.

#### How is a decision made?

The Independent Submissions Editor takes into account the preponderance of reviews, as well as the IESG’s input, in making a publication determination as to whether the document can be published. If it cannot, in some cases, this may be rectified with additional work by the authors. In other cases, the publication decision is final.

The Independent Submissions Editor reserves the right to not publish any work up until the point that it has been released as an RFC.

#### What happens if a work is declined?

Authors may seek further review of their work, either by the Independent Submissions Editor or by the IAB, who may choose to review a document or not. If it does, then the IAB will advise the Independent Submissions Editor as to their views. In all cases, the Independent Submissions Editor makes the final decision.

#### Can an Independent Submission be changed once it is published as an RFC?

No. RFCs are all but immutable. However, anyone may submit an erratum about any RFC, and those that are accepted will be noted on the RFC Editor web page.

#### More questions?

We are happy to answer any questions you might have. Contact us at [rfc-ise@rfc-editor.org](mailto:rfc-ise@rfc-editor.org).
