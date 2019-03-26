const Router = require('koa-router');
const router = new Router();
const cache = require('./common/cache');
const weibo = require('./common/weibo');
const logger = require('./common/logger');
const config = require('./config');

router.get('/convert', convertDomain);
router.get('/rss/:id', getWeiboRSS);

// Domain to uid
async function convertDomain(ctx) {
  const domain = ctx.request.query['domain'];
  try {
    // Verify
    if (!domain || !/^[A-Za-z0-9]{3,20}$/.test(domain)) {
      throw new Error('Invalid domain');
    }
    // start fetching
    const uid = await weibo.getUIDByDomain(domain);
    ctx.body = {
      success: true,
      uid
    };
  } catch (error) {
    logger.error(error);
    ctx.body = {
      success: false,
      msg: '获取数据时发生了错误'
    };
  }
}

// Get Weibo RSS
async function getWeiboRSS(ctx) {
  const uid = ctx.params['id'];
  const ip = ctx.ip;
  // options
  const largePic = ctx.query.largePic ? !!parseInt(ctx.query.largePic) : true;
  const emoji = ctx.query.emoji ? !!parseInt(ctx.query.emoji) : false;
  const options = {
    ttl: config.TTL,
    largePic,
    emoji
  };
  
  try {
    // check uid format
    if (!/^[0-9]{10}$/.test(uid)) {
      throw 'Invalid Format';
    }
    // start
    let startTime = Date.now();
    let hitCache = 0;
    let key = `total-${uid}${largePic ? '' : '-small'}${emoji ? '-emoji' : ''}`;
    const rssData = await cache.get(key).then(function (result) {
      if (result) {
        hitCache = 1;
        return result;
      } else {
        // fetch
        return weibo.fetchRSS(uid, options).then(function (data) {
          cache.set(key, data, config.TTL * 60);
          return data;
        });
      }
    });
    logger.info(`hit: ${hitCache}, ${Date.now() - startTime}ms, get ${uid} ${ip}`);
    // send data
    ctx.set('Content-Type', 'text/xml');
    ctx.body = rssData;
  } catch (error) {
    logger.error(`${error} - uid: ${uid} - IP: ${ip}`);
    if (error === "user_not_found") {
      ctx.status = 404;
      ctx.body = 'User Not Found';
    } else {
      ctx.status = 500;
      ctx.body = 'Error happened while processing this request';
    }
  }
}

module.exports = router;
