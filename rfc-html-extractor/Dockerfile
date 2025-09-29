FROM node:24
LABEL maintainer="IETF Tools Team <tools-discuss@ietf.org>"

RUN mkdir -p /app/rfc-html-extractor
RUN mkdir -p /app/client/app/utilities
RUN mkdir -p /app/client/generated

WORKDIR /app

COPY client/app/utilities/rfc-validators.ts ./client/app/utilities/rfc-validators.ts
COPY client/app/utilities/rfc-converter-parse.ts ./client/app/utilities/rfc-converter-parse.ts
COPY client/generated/red-client.ts ./client/generated/red-client.ts
COPY client/package.json ./client/package.json
COPY client/package-lock.json ./client/package-lock.json
COPY rfc-html-extractor/ ./rfc-html-extractor

WORKDIR /app/client
RUN npm ci

WORKDIR /app/rfc-html-extractor
RUN npm ci
