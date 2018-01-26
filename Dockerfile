FROM daocloud.io/node:6.9.0
MAINTAINER https://github.com/zgq354/weibo-rss
RUN mkdir /app
WORKDIR /app
RUN npm install -g forever
COPY package.json /app
RUN npm install
COPY . /app
VOLUME /app/logs
EXPOSE 3000
ENTRYPOINT forever --spinSleepTime 1000 --minUptime 1000 bin/www
