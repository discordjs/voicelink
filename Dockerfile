FROM jrottenberg/ffmpeg:4.3-alpine312 as ffmpeg

FROM node:16-alpine

WORKDIR /usr/voicelink
COPY package.json package-lock.json ./

RUN apk add --update \
&& apk add --no-cache ca-certificates \
&& apk add --no-cache --virtual .build-deps git curl build-base python3 g++ make \
&& npm ci \
&& apk del .build-deps

COPY --from=ffmpeg /usr/local /usr/local

COPY . .
RUN npm run build

CMD npm run start
