/**
 * URL 路由分发
 */
import Router from '@koa/router';
import NodeRSS from 'rss';
import { RSSKoaContext, RSSKoaState } from '../types';
import config from '../config';
import { DomainNotFoundError, statusToHTML, UserNotFoundError } from './weibo/weibo';
import { ThrottledError } from './throttler';
import { logger } from './logger';

export class UidInvalidError extends Error {
  constructor(uid: string) {
    super(`uid: ${uid}`);
  }
}

export class DomainInvalidError extends Error {
  constructor(domain: string) {
    super(`domain: ${domain}`);
  }
}

export const registerRoutes = (
  router: Router<RSSKoaState, RSSKoaContext>
) => {
  router.get('/rss/user/:id', async (ctx) => {
    const uid = ctx.params['id'];
    try {
      // check uid format
      if (!/^[0-9]{10}$/.test(uid)) {
        throw new UidInvalidError(uid);
      }

      // get data
      let cacheMiss = false;
      const xmlData = await ctx.cache.memo(async () => {
        const weiboData = await ctx.weibo.fetchUserLatestWeibo(uid);
        if (weiboData) {
          // basic info
          const feed = new NodeRSS({
            site_url: "https://weibo.com/" + uid,
            feed_url: '',
            title: weiboData.screenName + '的微博',
            description: weiboData.description,
            generator: 'https://github.com/zgq354/weibo-rss',
            ttl: config.rssTTL,
          });
          // item
          weiboData.statusList?.forEach((status) => {
            if (!status) return;
            feed.item({
              title: status.status_title || (status.text ? status.text.replace(/<[^>]+>/g, '').replace(/[\n]/g, '').substr(0, 25) : null),
              description: statusToHTML(status),
              url: 'https://weibo.com/' + uid + '/' + status.bid,
              date: new Date(status.created_at),
            });
          });
          cacheMiss = true;
          return feed.xml();
        }
      }, `xml-${uid}`, config.cacheTTL.rssXml);

      // send data
      ctx.set('Content-Type', 'text/xml');
      ctx.body = xmlData;

      // mark hit cache
      ctx.state.hit = cacheMiss ? 0 : 1;
    } catch (error) {
      if (error instanceof UidInvalidError) {
        ctx.status = 404;
        ctx.body = `找不到用户，传入 UID 格式有误。uid: ${uid}`;
        return;
      }
      if (error instanceof UserNotFoundError) {
        ctx.status = 404;
        ctx.body = `找不到用户，可能用户仅登录可见，不支持订阅。可以通过打开 https://m.weibo.cn/u/:uid 验证（<a href="https://m.weibo.cn/u/${uid}" target="_blank">uid: ${uid}</a>）`;
        return;
      }
      if (error instanceof ThrottledError) {
        ctx.status = 503;
        ctx.body = `暂时无法拉取到数据，请稍后再试。uid: ${uid}`;
        return;
      }
      ctx.status = 500;
      ctx.body = `未知错误，需管理员检查日志。uid: ${uid}`;
      logger.error(error);
    }
  });

  router.get('/api/domain2uid', async (ctx) => {
    const domain = ctx.request.query['domain'] as string;
    try {
      // verify
      if (!domain || !/^[A-Za-z0-9]{3,20}$/.test(domain)) {
        throw new DomainInvalidError(domain);
      }
      // start fetching
      let cacheMiss = false;
      const uid = await ctx.cache.memo(
        () => {
          cacheMiss = true;
          return ctx.weibo.fetchUIDByDomain(domain);
        },
        `dm-${domain}`,
        config.cacheTTL.apiDomain,
      );
      logger.debug(`domain: ${domain}, uid: ${uid}`);
      ctx.body = {
        success: true,
        uid
      };

      // mark hit cache
      ctx.state.hit = cacheMiss ? 0 : 1;
    } catch (error) {
      if (error instanceof DomainInvalidError || error instanceof DomainNotFoundError) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          msg: '找不到用户，可能是地址格式不正确',
        };
        return;
      }
      logger.error(error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        msg: '获取数据时发生了错误'
      };
    }
  })
};
