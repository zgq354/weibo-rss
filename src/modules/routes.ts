/**
 * URL 路由分发
 */
import Router from 'koa-router';
import Koa from 'koa';
import { RSSKoaContext } from '../types';

export const registerRoutes = (
  router: Router<Koa.DefaultState, RSSKoaContext>
) => {
  router.get('/rss/:id', (ctx) => {
    ctx.body = {
      success: true
    }
  });
};
