/**
 * Created by qing on 17-9-30.
 */
var express = require('express');
var weibo = require('../common/weibo');
var logger = require('../common/logger');

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

  weibo.fetchRSS(uid)
      .then(function (data) {
        // 发送结果
        res.header('Content-Type', 'text/xml');
        res.send(data);
      })
      .catch(function (err) {
        logger.error(`${err} - uid: ${uid} - IP: ${ip}`);
        next(err);
      });
});

module.exports = router;
