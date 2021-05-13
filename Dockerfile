FROM node:15-alpine

WORKDIR /usr/local/app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

CMD ["yarn", "start"]