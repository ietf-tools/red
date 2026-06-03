---
description: How the Independent Submission Stream works.
---

# Independent Submissions

The Independent Submission Stream allows RFC publication for some documents that are outside the official processes of the [IETF](https://www.ietf.org/), [IAB](https://www.iab.com/), and [IRTF](https://www.irtf.org/) but are relevant to the Internet community and achieve reasonable levels of technical and editorial quality. Note that RFCs published as independent submissions do not require, nor do they carry, community consensus, and they are not standards or best practices. [RFC 8730, "Independent Submission Editor Model"](/info/rfc8730/), as updated by [RFC 9920](/info/rfc9920/), describes the roles of

- the Independent Submissions Editor (ISE) and
- the [Independent Submissions Editorial Board](/authors/ise/iseb), which provides review for the ISE.

The Independent Submissions Editor (ISE) is currently [Eliot Lear](https://datatracker.ietf.org/person/lear@lear.ch), who can be reached at [rfc-ise@rfc-editor.org](mailto:rfc-ise@rfc-editor.org).

[Click here for steps to start the publication process](/authors/ise/ise-checklist).

## Publishing an Independent Submission

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
- [What is the Conflict of Interest Policy?](#what-is-the-conflict-of-interest-policy)
- [How can I submit an April 1st RFC?](#how-can-i-submit-an-april-1st-rfc)
- [More questions?](#more-questions)

#### What sort of documents are independent submissions?

The Independent Stream covers a number of classes of submissions, including discussions of technologies, options, or experience with protocols; humor; documentation of vendor-specific protocols; introduction of new ideas that may not yet be ripe for standardization; critiques of the IETF process; and a few other areas.

The current Independent Submissions Editor looks at a document through the lens of three questions:

1. Does this specification improve interoperability?
2. Does this document contribute to continuous improvement of the Internet?
3. Does this document provide the community some levity?

Not every submission needs to hit all three points.

The following figure depicts the different streams that feed into the RFC Series

![A description of the different streams that feed into the RFC series.  Once initially approved for publication, they are processed by the RFC Production Center, and then go on to be published.](/images/authors/rfc-independent-submissions-streams.png)

#### What are some examples of RFCs published through the Independent Stream that hit at least one of those points?

- [RFC 9446](/info/rfc9446/) provides us a retrospective on ten years after the Snowden revelations, how the community reacted, what was accomplished, and what could be done better.
- [RFC 9518](/info/rfc9518/) talks about Internet centralization, its impact, and what, if anything, can be done about it.
- [RFC 9405](/info/rfc9405/) discusses sarcasm in AI systems, and was written in part by ChatGPT.
- [RFC 9383](/info/rfc9383/) specifies the SPAKE2+ augmented password-authenticated key exchange (PAKE) protocol.

#### What other criteria are there for Independent Stream RFCs?

Documents must be well written, accurate, concise, and appropriate for the readership of the RFC series. They must not present security or operational risks to the Internet, they must adhere to any [IANA](https://iana.org/) rules for code point allocation, and in general may not create new IANA registries. Internal implementation descriptions are generally not accepted, nor are foundational formats upon which standards are expected to be built.

#### What if a document isn’t appropriate as an independent submission?

If a document is not appropriate as an independent submission, the Independent Submissions Editor will attempt to assist the authors to find a more appropriate home. That could be the IETF, the [IRTF](https://irtf.org/), some other standards organization, a blog, or an academic publication.

#### What about Intellectual Property Rights (IPR)?

An independent RFC should generally provide an open license to implement and deploy some or all of the technology described in the document; text from that document is available to be reused for any purpose.

#### What’s the process?

![The publication pipeline: steps include submission, initial evaluation, document updates, commissioned reviews, ISE review, more document updates, IESG conflict review, more document updates, publication request, to the RPC and final edits (AUTH48).](/images/authors/rfc-independent-submissions-process.png)
Everything begins with an Internet-Draft. You can use the same tooling that is used by the IETF to create and publish it onto the Datatracker. See [authors.ietf.org](https://authors.ietf.org) for more information about authoring tools.  
The rest of the process is summarized as follows:

1. Submit a draft
2. Fill out the independent submissions template
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

The Independent Submissions Editor is responsible for making decisions about each submission, in accordance with the guidance set forth in [RFC 4846](/info/rfc4846/). The Independent Submissions Editor is appointed by the [Internet Architecture Board (IAB)](https://iab.org/), and serves at their pleasure. Anyone may send comments to the IAB about the Independent Submissions Editor.

The Independent Submissions Editor is ably assisted by the [Independent Submissions Editorial Board](/authors/ise/iseb).

#### Who reviews submissions?

The Independent Submissions Editor seeks review of the work through individuals who are knowledgeable about the topic discussed in the draft. Authors are encouraged to submit suggestions, but some reviews will be conducted outside of that list. The ISE often relies on the [Independent Submissions Editorial Board](/authors/ise/iseb) to provide reviews. In addition, the ISE welcomes comments from **anyone** on a draft that is being considered by the ISE.  Information for reviewers can be found [here](/authors/ise/ise-reviewer-guidelines).

#### Where can reviews be found?

Unless they have been submitted anonymously, reviews are provided to authors and will be provided to others upon request.

![Snapshot of the Datatracker entry for a draft that shows reviews.](/images/authors/rfc-independent-submissions-reviews.png)

#### What is IETF Conflict Review?

In general, submissions should not conflict with IETF work or established best practices. [RFC 5742](/info/rfc5742/) provides the IESG the opportunity to comment about whether this is the case. Most of the time, a document will not get to the stage of the IESG even being consulted if such a conflict is likely. If the IESG determines that there is a conflict of some form, the ISE will attempt to work with authors and the IESG to resolve it satisfactorily.

#### How is a decision made?

The Independent Submissions Editor takes into account the preponderance of reviews, as well as the IESG’s input, in making a publication determination as to whether the document can be published. If it cannot, in some cases, this may be rectified with additional work by the authors. In other cases, the publication decision is final.

The Independent Submissions Editor reserves the right to not publish any work up until the point that it has been released as an RFC.

#### What happens if a work is declined?

Authors may seek further review of their work, either by the Independent Submissions Editor or by the IAB, who may choose to review a document or not. If it does, then the IAB will advise the Independent Submissions Editor as to their views. In all cases, the Independent Submissions Editor makes the final decision.

#### Can an Independent Submission be changed once it is published as an RFC?

No. RFCs are all but immutable. However, anyone may submit an erratum about any RFC, and those that are accepted will be noted on the RFC info page and [RFC errata site](https://errata.rfc-editor.org).

#### What is the Conflict of Interest Policy?

From time to time, the Independent Submissions Editor may have a conflict of interest, or the appearance of a conflict of interest, with regard to a particular draft. This can occur for a number of reasons, for example, a document submitted by an author that is employed by the same employer as the ISE or one of its competitors. Such relationships in and of themselves may not lead to variance in the editorial process, but they must be disclosed.

When the ISE believes that there may be a conflict of interest, or if authors or others believe that there may be a conflict of interest, the matter will be referred to the [Independent Submissions Editorial Board](/authors/ise/iseb). They will advise the ISE as to what should happen at the various stages of the publication process. The ISE will inform the community and authors of such conflicts, and any actions to be taken as a result.

#### How can I submit an April 1st RFC?

April 1st submissions are the only RFCs-to-be that are not posted as Internet-Drafts. These entries should be sent directly to the [RFC Editor](mailto:rfc-editor@rfc-editor.org). Please send all entries by early March, so that by mid March the ISE can hand over the selected documents to the RPC for editing and publication.

#### More questions?

We are happy to answer any questions you might have. Contact us at [rfc-ise@rfc-editor.org](mailto:rfc-ise@rfc-editor.org).
