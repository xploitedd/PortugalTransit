FROM node:10.8.0

RUN mkdir /src

WORKDIR /src
ADD . /src

RUN npm install -g nodemon typescript tslint && \
    cd /src && \
    npm install && \
    npm run build

EXPOSE 3000

CMD [ "nodemon", "dist/app.js" ]