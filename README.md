<div align="center">
  
<img src="https://static.ietf.org/logos/icon-rfceditor.svg" alt="RFC Editor" height="125" />

# RFC Editor Website

[![Release](https://img.shields.io/github/release/ietf-tools/red.svg?style=flat&maxAge=300)](https://github.com/ietf-tools/red/releases)
[![License](https://img.shields.io/github/license/ietf-tools/red)](https://github.com/ietf-tools/red/blob/main/LICENSE)
![Node Version](https://img.shields.io/badge/node.js-24-green?logo=node.js&logoColor=white)
![Nuxt Version](https://img.shields.io/badge/nuxt-4-green?logo=nuxt.js&logoColor=white)
![Vue Version](https://img.shields.io/badge/vue-3-green?logo=vue.js&logoColor=white)

##### Website for the RFC Editor (Codename: RED)

</div>

# Design

- The [new www.rfc-editor.org design on Figma](https://www.figma.com/design/bCDqtdSnErGOe6Oc87W8pR/RFC-Editor---Design-2). As development continues this is the graphic design that we will be adhering to where possible.

# Contributing

This code repository is under the broader guidance from [IETF CONTRIBUTING.md](https://github.com/ietf-tools/.github/blob/main/CONTRIBUTING.md).

# Development

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) _(Windows only)_

## Getting Started

### Website

See `/website/`.

It's a Nuxt website ([official Nuxt documentation](https://nuxt.com/docs/getting-started/introduction)).

#### Website content (markdown)

Website content from markdown files can be found in `/website/content/`.

Markdown Frontmatter (metadata) fields supported are listed in [content.config.js](https://github.com/ietf-tools/red/blob/main/website/content.config.ts#L8).

The 'last updated' footer on markdown pages is computed from Git log's commit time.
It is manually synced by a developer by running (from within `website/`) the command `npm run generate:content-metadata`.
This will update `generated/content-metadata.json` and that file should be committed.


#### Website testing

In `/website/` run `npm run test`

#### Website APIs

The website depends on APIs in the form of:
* Search (via Typesense, managed outside of this repository)
* Precomputed API responses (managed in this repository, in `/precomputer/`)

### Precomputed API responses

See `/precomputer/`.

We precompute the result of many APIs used by the website and upload them to an S3-like bucket.

This is done for performance reasons (some these APIs can take minutes to compute) and it improves resilience.

The `/precomputer/` code is intentionally separate from the website/Nuxt. It has its own `package.json` etc.

The entry point for the precomputer is `precomputer/src` with the items `single.ts`, `all.ts`, `multiple.ts`, and `cron.ts`:

* `single.ts` calculates a single RFC 'info' page API data and RFC-specific APIs such as `/rfc/rfcN.json`.
  * `all.ts` does the same with ranges of RFCs. `multiple.ts` handles a comma-separated list of RFC numbers.
* `cron.ts` handles indices (all subseries, RFC indexes like on the homepage that list all RFCs, RSS/Atom feeds, etc.). As the name `cron.ts` implies this script is run periodically.

#### Precomputer tests

In `/precomputer/` run `npm run test`.

## Troubleshooting

### During local dev website doesn't update with changes

Stop the dev server, run `npm run cleanup`, and restart the dev server
