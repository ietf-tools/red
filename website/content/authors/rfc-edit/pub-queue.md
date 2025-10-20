# Current Publication Queue

As streams approve documents for publication, they enter the [publication queue](/authors/rfc-edit/pub-queue/), which provides information about documents as they progress through the RFC Editorial Process. The queue is also available as an [XML file](/queue2.xml).

See:

- [Definitions of Queue States](#definitions-of-queue-states)
- [Definitions of Flags](#definitions-of-flags)
- [Definitions of MISSREF Generation Numbers](#definitions-of-missref-generation-numbers)
- [Document Clusters in Queue](/authors/rfc-edit/doc-clusters/)
- [Process Flow Chart](#publication-flow-chart)

## Publication Queue

FIXME: embed https://www.rfc-editor.org/current_queue.php

## Definitions of Queue States

- EDIT = Awaiting editing/formatting or actively being edited/formatted
- RFC-EDITOR = Undergoing final internal RPC review before AUTH48
- AUTH48 = Awaiting final approval(s) from authors and/or relevant parties
- AUTH48-DONE = Awaiting publication as AUTH48 approvals are complete
- AUTH = Awaiting some author action (prior to AUTH48)
- IESG = Awaiting IESG action
- IANA = Awaiting completion of IANA actions after document has otherwise completed EDIT state
- TI = Awaiting resolution of a Tooling Issue. Publication of the document is on hold pending the resolution of an issue with the software tools used to create the files.
- REF = Awaiting a normative reference’s completion of the editorial process (i.e. a normative reference that is in the queue). (Note that "REF" is also used to mark a list of normative references shown on cluster pages. Each reference is listed as IN-QUEUE or NOT-RECEIVED.)
- MISSREF = Awaiting one or more normative references that are not yet in the publication queue (i.e., NOT-RECEIVED), or awaiting one or more documents that are not yet in the queue per the request of the authors or a stream manager. Please see MISSREF Generation Numbers and Document Clusters in Queue for more information.

## Definitions of Flags

A document can move through various states while having either, both, or none of the following flags set:

- \*A \= IANA flag. The document has IANA actions that are not yet complete.
- \*R \= Reference flag. The document has one or more normative references that are IN-QUEUE or NOT-RECEIVED.

## Definitions of MISSREF Generation Numbers

- 1G = The document has a normative reference to a NOT-RECEIVED document.
- 2G = The document has a normative reference to a document that normatively references a NOT-RECEIVED document.
- 3G = The document has a normative reference to a document that normatively references a document that normatively references a NOT-RECEIVED document.

## Publication Flow Chart

![Publication flow chart](/images/authors/rfc-edit/pub-queue-flow-chart.png)
