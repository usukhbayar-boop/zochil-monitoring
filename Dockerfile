FROM node:16-alpine
RUN apk add --no-cache make gcc g++ python3

RUN addgroup -S zochil && adduser -S zochil -G zochil
USER zochil
RUN mkdir -p /home/zochil/api/node_modules && chown -R zochil:zochil /home/zochil/api
WORKDIR /home/zochil/api

COPY package.json ./

RUN npm install --legacy-peer-deps --omit=dev
COPY --chown=zochil:zochil ./dist/api ./api
COPY --chown=zochil:zochil ./dist/lib ./lib
COPY --chown=zochil:zochil ./resources ./resources
COPY --chown=zochil:zochil ./tsconfig.json ./tsconfig.json
COPY --chown=zochil:zochil ./index.js ./index.js

EXPOSE $PORT

CMD [ "node", "index.js" ]
