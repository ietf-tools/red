---
description: Download, mirror or get a feed of RFCs
---

# Download RFCs

## Feed of recently published RFCs

To be notified of newly published RFCs, use the [RSS feed](/rfcrss.xml) or [Atom feed](/rfcatom.xml).

## Download RFCs Using rsync

To download RFCs and keep them up to date locally, use [rsync](https://rsync.samba.org).

### To get the list of modules available type `rsync rsync.rfc-editor.org::` This will return the following results:

| Module Names      | Comments                                                                    |
| :---------------- | :-------------------------------------------------------------------------- |
| everything-ftp    | Everything FTP                                                              |
| rfcs              | Contents of in-notes/ and subdirectories `bcp/`, `fyi/`, `ien/`, and `std/` |
| rfcs-text-only    | Text files from `[rfcs]`                                                    |
| rfc-ed-all        | Entire repository (excluding Internet-Drafts)                               |
| rfcs-pdf-only     | PDF versions of ASCII RFCs to ensure correct page breaks, etc.              |
| rfcs-exclude-json | Contents of `[rfcs]` excluding JSON files                                   |
| rfcs-json-only    | Only the JSON files from the directories in `[rfcs]`                        |

### To create a mirror using a module

Type `rsync \-avz \--delete rsync.rfc-editor.org::Module-Name Target-Directory`

For example: To create a mirror of the text versions of all the RFCs, i.e.,

```
in-notes/\*.txt
in-notes/bcp/\*.txt
in-notes/fyi/\*.txt
in-notes/ien/\*.txt
in-notes/std/\*.txt
```

type `rsync \-avz \--delete rsync.rfc-editor.org::rfcs-text-only my-rfc-mirror`

(The `\--delete` option is useful for removing local copies of files that have been deleted from the repository as well as expired Internet-Drafts.)

## Download RFCs in TAR or ZIP Files

RFCs are available in three file formats: TXT, PDF, and XML. The XML format is only available for RFC 8650 and later.

FIXME: generate a download table
