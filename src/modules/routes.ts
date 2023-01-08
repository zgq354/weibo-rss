/**
 * URL 路由分发
 */
import Router from '@koa/router';
import NodeRSS from 'rss';
import { RSSKoaContext, RSSKoaState } from '../types';
import config from '../config';
import { statusToHTML } from './weibo/weibo';
import { UserNotFoundError } from './weibo/api';
import { ThrottledError } from './throttler';

export class UidInvalidError extends Error {
  constructor(uid: string) {
    super(`uid: ${uid}`);
    this.name = this.constructor.name;
  }
}

export const registerRoutes = (
  router: Router<RSSKoaState, RSSKoaContext>
) => {
  router.get('/rss/:id', async (ctx) => {
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
      switch (error?.name) {
        case UidInvalidError.name:
          ctx.status = 404;
          ctx.body = `找不到用户，传入 UID 格式有误。uid: ${uid}`;
          return;
        case UserNotFoundError.name:
          ctx.status = 404;
          ctx.body = `找不到用户，可能是用户微博在未登录状态下不可见，或用户已被屏蔽。uid: ${uid}`;
          return;
        case ThrottledError.name:
          ctx.status = 503;
          ctx.body = `暂时无法拉取到数据，请稍后再试。uid: ${uid}`;
          return;
        default:
          ctx.status = 500;
          ctx.body = `未知错误，请检查日志。uid: ${uid}`;
          break;
      }
    }
  });
};
