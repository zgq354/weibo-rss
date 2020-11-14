/**
 * URL 路由分发
 */
import Router from 'koa-router';
import convertDomainToUID from './controller/convertDomainToUID';

const router = new Router();

router.get('/convert', convertDomainToUID);

export default router;
