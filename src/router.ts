/**
 * URL 路由分发
 */
import Router from 'koa-router';
import convertDomainToUID from './controller/convertDomainToUID';
import getWeiboRSS, { checkWeiboUID } from './controller/getWeiboRSS';

const router = new Router();

router.get('/convert', convertDomainToUID);
router.get('/rss/:id', checkWeiboUID, getWeiboRSS);

export default router;
