FROM node:22-bookworm-slim AS build

WORKDIR /build

# files: build / meta
COPY .babelrc.js .
COPY webpack.config.js .
COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .

# files: source
COPY index.html .
COPY src src

# files: datasets
COPY datasets datasets

# install dependencies
RUN npm ci

# build
RUN npm run build


FROM nginx:1.26-bookworm

WORKDIR /

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /build/dist /app
