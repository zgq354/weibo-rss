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
  // 传入微博用户的uid
  var uid = req.params['id'];
  // 是否大图
  var largePic = req.query.largePic ? !!parseInt(req.query.largePic) : true;

  var options = {
    largePic,
    ttl: TTL
  };  

  // 获取 IP地址
  var ip = req.headers['x-forwarded-for'] ||
  req.connection.remoteAddress ||
  req.socket.remoteAddress ||
  req.connection.socket.remoteAddress;

  // 验证参数格式
  if (!/^[0-9]*$/.test(uid)) {
    console.log("Invalid Format");
    return next();
  }

  logger.info(`get weibo of uid: ${uid} - IP: ${ip}`);

  // 读取缓存
  var key = `total-${uid}${largePic ? '' : '-small'}`;
  cache.get(key).then(function (result) {
    if (result) {
      return Promise.resolve(result);
    } else {
      // 抓取
      return weibo.fetchRSS(uid, options).then(function (data) {
        // 存入缓存
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
