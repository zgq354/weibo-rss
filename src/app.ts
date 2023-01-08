/**
 * 程序入口
 */
import Koa from 'koa';
import Router from '@koa/router';
import serve from 'koa-static';
import path from 'path';
import config from './config';
import { logger } from "./modules/logger";
import { normalizePort } from './utils';
import { registerRoutes } from './modules/routes';
import { RSSKoaContext, RSSKoaState } from './types';
import { LevelCache } from './modules/cache';
import { WeiboData } from './modules/weibo/weibo';

const koaApp = new Koa<RSSKoaState, RSSKoaContext>();
const initApp = () => {
  const router = new Router<RSSKoaState, RSSKoaContext>();
  registerRoutes(router);

  // levelCache
  const cache = LevelCache.getInstance(path.join(config.rootDir, 'data'), logger);
  cache.startScheduleCleanJob();

  // weibo
  const weiboData = new WeiboData(cache, logger);

  // enable X-Forwarded-For
  koaApp.proxy = true;

  // init middleware
  return koaApp
    .use(async (ctx, next) => {
      // duration log
      const startTime = Date.now();
      logger.debug(`${ctx.req.method} ${ctx.originalUrl} ${ctx.ip}`);
      await next();
      const duration = Date.now() - startTime;
      logger.info(`[${ctx.status}] ${ctx.req.method} ${ctx.originalUrl} ${ctx.ip} hit: ${ctx.state.hit || 0} ${duration}ms`);
    })
    .use(async (ctx, next) => {
      ctx.cache = cache;
      ctx.weibo = weiboData;
      await next();
    })
    .use(serve(config.rootDir + '/public'))
    .use(router.routes());
};

// start service
initApp();
const port = normalizePort(process.env.PORT || config.port);
koaApp.listen(port, () => {
  logger.info(`weibo-rss start`);
  logger.info(`Listening http://0.0.0.0:${port}`);
});
