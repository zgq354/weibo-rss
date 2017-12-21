/**
 * Created by qing on 17-9-30.
 */
var express = require('express');
var weibo = require('../common/weibo');
var logger = require('../common/logger');
var cache = require('../common/cache');

// 临时引入一个文件缓存，之后再考虑重构
var CachemanFile = require('cacheman-file');
var fileCache = new CachemanFile({
  tmpDir: 'data/cache'
});

// 做一个支持 Promise 的获取缓存接口
function getFileCache(key) {
  return new Promise(function(resolve, reject) {
    fileCache.get(key, function (err, data) {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    })
  });
}

var router = express.Router();

/* GET weibo rss. */
router.get('/:id', function(req, res, next) {
  // 传入微博用户的uid
  var uid = req.params['id'];
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

  var key = `weibo-rss-${uid}`;
  // 读取缓存
  getFileCache(key).then(function (result) {
    if (result) {
      // 发送结果
      res.header('Content-Type', 'text/xml');
      res.send(result);
    } else {
      // 缓存不存在时候就直接抓取
      weibo.fetchRSS(uid)
        .then(function (data) {
          // 存入缓存
          fileCache.set(key, data, 300);
          // 发送结果
          res.header('Content-Type', 'text/xml');
          res.send(data);
        })
        .catch(function (err) {
          logger.error(`${err} - uid: ${uid} - IP: ${ip}`);
          next();
        });
    }
  }).catch(function (err) {
    logger.error(`Redis error ${err} - uid: ${uid} - IP: ${ip}`);
    next(err);
  });
});

module.exports = router;
