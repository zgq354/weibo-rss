
const Koa = require('koa');
const serve = require('koa-static');
const router = require('./routes');
const logger = require('./common/logger');

const app = new Koa();

// enable X-Forwarded-For
app.proxy = true;

// logger
app.use(async (ctx, next) => {
  const startTime = Date.now();
  logger.debug(`${ctx.req.method} ${ctx.originalUrl} ${ctx.ip}`);
  await next();
  logger.info(`[${ctx.status}] ${ctx.req.method} ${ctx.originalUrl} ${ctx.ip} ${Date.now() - startTime}ms`);
});

app.use(serve(__dirname + '/public'));
app.use(router.routes());

app.start = function (port) {
  app.listen(port, function () {
    logger.info(`weibo-rss start`);
    logger.info(`Listening Port ${port}`);
  });
};

module.exports = app;
