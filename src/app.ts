/**
 * 程序入口
 */
import Koa from 'koa';
import Router from 'koa-router';
import serve from 'koa-static';
import path from 'path';
import config from './config';
import { logger } from "./modules/logger";
import { normalizePort } from './utils';
import { registerRoutes } from './modules/routes';
import { RSSKoaContext } from './types';
import { LevelCache } from './modules/cache';

const koaApp = new Koa<Koa.DefaultState, RSSKoaContext>();
const router = new Router<Koa.DefaultState, RSSKoaContext>();

registerRoutes(router);

const cache = LevelCache.getInstance(path.join(config.rootDir, 'data'), logger);
cache.startScheduleCleanJob();

// enable X-Forwarded-For
koaApp.proxy = true;

koaApp
  .use(async (ctx, next) => {
    // duration log
    const startTime = Date.now();
    logger.debug(`${ctx.req.method} ${ctx.originalUrl} ${ctx.ip}`);
    await next();
    const duration = Date.now() - startTime;
    logger.info(`[${ctx.status}] ${ctx.req.method} ${ctx.originalUrl} ${ctx.ip} ${duration}ms`);
  })
  .use(async (ctx, next) => {
    ctx.cache = cache;
    await next();
  })
  .use(serve(config.rootDir + '/public'))
  .use(router.routes());

// start service
const port = normalizePort(process.env.PORT || config.port);
koaApp.listen(port, () => {
  logger.info(`weibo-rss start`);
  logger.info(`Listening http://0.0.0.0:${port}`);
});
