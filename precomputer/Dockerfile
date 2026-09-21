FROM node:24
LABEL maintainer="IETF Tools Team <tools-discuss@ietf.org>"

RUN mkdir -p /app/precomputer
RUN mkdir -p /app/website/app/utilities
RUN mkdir -p /app/website/content
RUN mkdir -p /app/website/generated

WORKDIR /app

COPY website/app/utilities/rfc-validators.ts ./website/app/utilities/rfc-validators.ts
COPY website/content/ ./website/content/
COPY website/generated/content-metadata.json ./website/generated/content-metadata.json
COPY website/generated/reef-api-zod.ts ./website/generated/reef-api-zod.ts
COPY website/generated/reef-api-zod.types.d.ts ./website/generated/reef-api-zod.types.d.ts
COPY precomputer/generated/api-client.ts ./precomputer/generated/api-client.ts
COPY website/package.json ./website/package.json
COPY website/package-lock.json ./website/package-lock.json
COPY precomputer/ ./precomputer

WORKDIR /app/website
RUN npm ci

WORKDIR /app/precomputer
RUN npm ci
