FROM node:20-bookworm-slim AS build

WORKDIR /build

# files: build / meta
COPY .babelrc.js .
COPY webpack.config.js .
COPY package.json .
COPY package-lock.json .

# files: source
COPY index.html .
COPY src src

# install dependencies
RUN npm ci

# build
RUN npm build


FROM nginx:1.25-bookworm

WORKDIR /

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /build/dist /app
