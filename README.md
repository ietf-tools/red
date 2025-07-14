<div align="center">
  
<img src="https://raw.githubusercontent.com/ietf-tools/common/main/assets/logos/rfced-www.svg" alt="RFC" height="125" />

[![Release](https://img.shields.io/github/release/ietf-tools/rfced-www.svg?style=flat&maxAge=300)](https://github.com/ietf-tools/rfced-www/releases)
[![License](https://img.shields.io/github/license/ietf-tools/rfced-www)](https://github.com/ietf-tools/rfced-www/blob/main/LICENSE)
![Node Version](https://img.shields.io/badge/node.js-20-green?logo=node.js&logoColor=white)
![Nuxt Version](https://img.shields.io/badge/nuxt-3-green?logo=nuxt.js&logoColor=white)
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

### Client

See `/client/`

#### RFC HTML preprocessing

To display RFCs we preprocesses their HTML into JSON with certain features extracted (eg Table Of Contents). This is done in [`red-rfc-html-extractor`](https://github.com/ietf-tools/red-rfc-html-extractor).

#### Page content documentation (markdown)

Markdown files are in `client/content`. Markdown Frontmatter (metadata) fields supported are listed in [content.config.js](https://github.com/ietf-tools/red/blob/main/client/content.config.ts#L8).

## Testing

### Visual regression testing

Visual regression testing compares screenshots of the app against approved 'baseline' screenshots.

The pages or components being screenshotted are specified in `*.story.vue` files using [Histoire.dev](https://histoire.dev/).

The screenshots are taken using [Lost Pixel OSS](https://www.lost-pixel.com/) in docker, ensuring that there are no OS differences in rendering between CI and local tests. These approved 'baseline' screenshots are found in `client/.lostpixel/baseline`.

#### How to test visual regressions

1. If necessary create or update a `*.story.vue` file with your components. Be sure to include every configuration of your component.
2. Run `npm run story:dev` to see the component library and view your component and make sure it works.
3. Run `npm run story:build` ...which builds the `*.story.vue` files.
4. `npm run test:story` ...tests screenshots of the aforementioned build (using [Lost Pixel OSS](https://www.lost-pixel.com/)) giving either a pass (exiting cleanly) or fail (exiting with an exception).
   a. If 'pass' then you're done, and you can push your changes.
   b. If 'fail' then run `npm run test:story:view` to view the differences in a browser. Find the `*.story.vue` files that were affected and rerun `npm run story:build` and `npm run test:story` until you're happy with the changes. When ready to approve ALL the changes run `npm run test:story:approve`, commit the updated 'baseline' images in `client/.lostpixel/baseline`, and push the changes. If

##### Troubleshooting `npm run test:story:approve`

This command should always succeed. If it fails it usually means there's a JavaScript exception being thrown in the app. Read all the console output carefully, and try viewing your component with `npm run story:dev` to see if there's an exception being thrown.

## Troubleshooting

### During local dev website doesn't update with changes

Stop the dev server, run `npm run cleanup`, and restart the dev server.
