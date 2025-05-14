FROM node:22
LABEL maintainer="IETF Tools Team <tools-discuss@ietf.org>"

RUN mkdir -p /app && \
    chown node:node /app
WORKDIR /app

COPY client/.output ./
COPY client/.data/content/contents.sqlite ./server/

USER node:node
CMD ["node", "server/index.mjs"]