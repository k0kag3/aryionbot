FROM node:14

WORKDIR /usr/local/app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

CMD ["yarn", "start"]