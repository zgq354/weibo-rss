/**
* Created by qing on 17-9-30.
*/
var express = require('express');
var weibo = require('../common/weibo');
var logger = require('../common/logger');
var cache = require('../common/cache');

var router = express.Router();

// 微博缓存时间（分钟）
const TTL = 15;

/* GET weibo rss. */
router.get('/:id', function(req, res, next) {
  var uid = req.params['id'];
  // 参数设定
  var largePic = req.query.largePic ? !!parseInt(req.query.largePic) : true;
  var emoji = req.query.emoji ? !!parseInt(req.query.emoji) : false;
  var options = {
    largePic,
    ttl: TTL,
    emoji
  };

  // 获取 IP地址
  var ip = req.headers['x-forwarded-for'] ||
  req.connection.remoteAddress ||
  req.socket.remoteAddress ||
  req.connection.socket.remoteAddress;

  // 验证参数格式
  if (!/^[0-9]{10}$/.test(uid)) {
    logger.error(`Invalid Format ${uid} ${ip}`);
    return next();
  }

  logger.info(`get ${uid} ${ip}`);

  var key = `total-${uid}${largePic ? '' : '-small'}${emoji ? '-emoji' : ''}`;
  cache.get(key).then(function (result) {
    if (result) {
      return Promise.resolve(result);
    } else {
      // 抓取
      return weibo.fetchRSS(uid, options).then(function (data) {
        cache.set(key, data, TTL * 60);
        return Promise.resolve(data);
      }).catch(function (err) {
        logger.error(`${err} - uid: ${uid} - IP: ${ip}`);
        return Promise.reject();
      });
    }
  }).then(function (data) {
    // 发送结果
    res.header('Content-Type', 'text/xml');
    res.send(data);
  }).catch(function (err) {
    if (err) logger.error(`Cache error - ${err} - uid: ${uid} - IP: ${ip}`);
    next(err);
  });
});

module.exports = router;
