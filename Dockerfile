FROM daocloud.io/node:6.9.0
MAINTAINER https://github.com/zgq354/weibo-rss
RUN mkdir /app
WORKDIR /app
RUN npm install -g forever
COPY package.json /app
RUN npm install
COPY . /app
ENV REDIS_PORT_6379_TCP_ADDR ${REDIS_PORT_6379_TCP_ADDR}
ENV REDIS_PORT_6379_TCP_PORT ${REDIS_PORT_6379_TCP_PORT}
ENV REDIS_PASSWORD ${REDIS_PASSWORD}
VOLUME /app/logs
EXPOSE 3000
ENTRYPOINT forever --spinSleepTime 1000 --minUptime 1000 bin/www