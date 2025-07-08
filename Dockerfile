FROM node:20 AS base
WORKDIR /usr/local/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]