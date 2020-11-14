/**
 * 程序入口
 */
import Koa from 'koa';
import serve from 'koa-static';
import config from './config';
import router from './router';
import { logger } from "./lib/logger";
import { normalizePort } from './lib/port';

const app = new Koa();

// enable X-Forwarded-For
app.proxy = true;

// 请求响应测速
app.use(async (ctx, next) => {
  const startTime = Date.now();
  logger.debug(`${ctx.req.method} ${ctx.originalUrl} ${ctx.ip}`);
  await next();
  const duration = Date.now() - startTime;
  logger.info(`[${ctx.status}] ${ctx.req.method} ${ctx.originalUrl} ${ctx.ip} ${duration}ms`);
});

// static files
app.use(serve(config.rootDir + '/public'));
// router
app.use(router.routes());

// start listen port
const port = normalizePort(process.env.PORT || config.port);
app.listen(port, function () {
  logger.info(`weibo-rss start`);
  logger.info(`Listening http://0.0.0.0:${port}`);
});
