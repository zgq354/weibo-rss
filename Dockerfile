FROM daocloud.io/node:8
LABEL maintainer="https://github.com/zgq354/weibo-rss"
RUN mkdir /app
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
VOLUME /app/logs
EXPOSE 3000
ENTRYPOINT npm start
