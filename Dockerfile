FROM node:16

RUN apt update
RUN apt install zip
RUN apt install -y fish
WORKDIR /app
COPY package*.json ./
RUN npm install --quiet
COPY . .


