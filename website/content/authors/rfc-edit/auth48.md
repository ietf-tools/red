# Authors' Final Review (AUTH48)

AUTH48 is the last chance to make changes to an RFC-to-be. Once the document is published as an RFC, we will not make changes. The general instructions for completing AUTH48 are below; they are similar to what you will receive via email when your document enters AUTH48 state. If your document is in AUTH48 state, we recommend referring to the email you received.

Additional resources:

- [AUTH48 FAQ](/series/rfc-faq/#process)
- [The Publication Process](/authors/rfc-edit/)

### Template of Instructions for Completing AUTH48

Your document has now entered AUTH48. Once it has been reviewed and approved by you and all coauthors, it will be published as an RFC. If an author is no longer available, there are several remedies available as listed in the [FAQ](/series/rfc-faq/#missingauthor).

You and you coauthors are responsible for engaging other parties (e.g., Contributors or Working Group) as necessary before providing your approval.

### Planning your review

Please review the following aspects of your document:

**RFC Editor questions**

Please review and resolve any questions raised by the RFC Editor that have been included in the XML file as comments marked as follows:

These questions will also be sent in a subsequent email.

**Changes submitted by coauthors**

Please ensure that you review any changes submitted by your coauthors. We assume that if you do not speak up that you agree to changes submitted by your coauthors.

**Content**

Please review the full content of the document, as this cannot change once the RFC is published. Please pay particular attention to:

- IANA considerations updates (if applicable)
- contact information
- references

**Copyright notices and legends**

Please review the copyright notice and legends as defined in RFC 5378 and the Trust Legal Provisions (TLP [https://trustee.ietf.org/license-info/](https://trustee.ietf.org/license-info/)).

**Semantic markup**

Please review the markup in the XML file to ensure that elements of content are correctly tagged. For example, ensure that `<sourcecode>` and `<artwork>` are set correctly. See the [RFCXML vocabulary reference](https://authors.ietf.org/rfcxml-vocabulary) for details about [`<sourcecode>`](https://authors.ietf.org/rfcxml-vocabulary#sourcecode) and [`<artwork>`](https://authors.ietf.org/rfcxml-vocabulary#artwork).

**Formatted output**

Please review the PDF, HTML, and TXT files to ensure that the formatted output, as generated from the markup in the XML file, is reasonable. Please note that the TXT will have formatting limitations compared to the PDF and HTML.

### Submitting changes

To submit changes, please reply to the email using _REPLY ALL_ as all the parties CCed on the message need to see your changes. The parties include:

- your coauthors
- [rfc-editor@rfc-editor.org](mailto:rfc-editor@rfc-editor.org) (the RPC team)
- other document participants, depending on the stream (e.g., IETF Stream participants are your working group chairs, the responsible ADs, and the document shepherd).
- auth48archive@rfc-editor.org, which is an archival mailing list to preserve AUTH48 conversations; it is not an active discussion list:

  - See more info [here](https://mailarchive.ietf.org/arch/msg/ietf-announce/yb6lpIGh-4Q9l2USxIAe6P8O4Zc)
  - [The archive itself](https://mailarchive.ietf.org/arch/browse/auth48archive/)

  Note: If only absolutely necessary, you may temporarily opt out of the archiving of messages (e.g., to discuss a sensitive matter). If needed, please add a note at the top of the message that you have dropped the address. When the discussion is concluded, auth48archive@rfc-editor.org will be re-added to the CC list and its addition will be noted at the top of the message.

You may submit your changes in one of two ways:

An update to the provided XML file

**OR**

An explicit list of changes in this format

```
Section # (or indicate Global)

OLD:
old text

NEW:
new text
```

You do not need to reply with both an updated XML file and an explicit list of changes, as either form is sufficient.

We will ask a stream manager to review and approve any changes that seem beyond editorial in nature, e.g., addition of new text, deletion of text, and technical changes. Information about stream managers can be found in the FAQ. Editorial changes do not require approval from a stream manager.

### Approving for publication

To approve your RFC for publication, please reply to this email stating that you approve this RFC for publication. Please use _REPLY ALL_, as all the parties CC\*ed on this message need to see your approval.

### Files

The files are available here:

- `https://www.rfc-editor.org/authors/rfcXXXX.xml`
- `https://www.rfc-editor.org/authors/rfcXXXX.html`
- `https://www.rfc-editor.org/authors/rfcXXXX.pdf`
- `https://www.rfc-editor.org/authors/rfcXXXX.txt`

Diff file of the text: `https://www.rfc-editor.org/authors/rfcXXXX-diff.html`

Diff of the XML: `https://www.rfc-editor.org/authors/rfcXXXX-xmldiff1.html`

The following files are provided to facilitate creation of your own  
diff files of the XML.

Initial XMLv3 created using XMLv2 as input: `https://www.rfc-editor.org/authors/rfcXXXX.original.v2v3.xml`

XMLv3 file that is a best effort to capture v3-related format updates only:

`https://www.rfc-editor.org/authors/rfcXXXX.form.xml`

### Tracking progress

The details of the AUTH48 status of your document are here:

- `https://www.rfc-editor.org/auth48/rfcXXXX`

Please let us know if you have any questions.
