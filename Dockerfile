FROM node:16

RUN apt update
RUN apt install zip
WORKDIR /app
COPY package*.json ./
RUN npm install --quiet
COPY . .


