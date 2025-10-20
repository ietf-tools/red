<div align="center">
  
<img src="https://raw.githubusercontent.com/ietf-tools/common/main/assets/logos/rfced-www.svg" alt="RFC" height="125" />

[![Release](https://img.shields.io/github/release/ietf-tools/rfced-www.svg?style=flat&maxAge=300)](https://github.com/ietf-tools/rfced-www/releases)
[![License](https://img.shields.io/github/license/ietf-tools/rfced-www)](https://github.com/ietf-tools/rfced-www/blob/main/LICENSE)
![Node Version](https://img.shields.io/badge/node.js-20-green?logo=node.js&logoColor=white)
![Nuxt Version](https://img.shields.io/badge/nuxt-4-green?logo=nuxt.js&logoColor=white)
![Vue Version](https://img.shields.io/badge/vue-3-green?logo=vue.js&logoColor=white)

##### Website for the RFC Editor

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

See `/website/`

#### API

We precompute the result of many APIs because some calculations can take minutes. This also helps with resilience. See `/precomputer/`.

#### Page content documentation (markdown)

Markdown files are in `website/content`. Markdown Frontmatter (metadata) fields supported are listed in [content.config.js](https://github.com/ietf-tools/red/blob/main/website/content.config.ts#L8).

## Testing

* In `website` run `npm run test`
* In `precomputer` run `npm run test`

## Troubleshooting

### During local dev website doesn't update with changes

Stop the dev server, run `npm run cleanup`, and restart the dev server.
