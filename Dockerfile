FROM node:latest
WORKDIR /usr/src/tpp_status
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 9030
CMD [ "node", "index.js" ]