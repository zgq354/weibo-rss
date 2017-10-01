/**
 * Created by qing on 17-9-30.
 */
var express = require('express');
var weibo = require('../common/weibo');

var router = express.Router();

/* GET weibo rss. */
router.get('/:id', function(req, res, next) {
  // 传入微博用户的uid
  var uid = req.params['id'];

  // 验证参数格式
  if (!/^[0-9]*$/.test(uid)) {
    console.log("Invalid Format");
    return next();
  }

  weibo.fetchRSS(uid)
      .then(function (data) {
        // 发送结果
        res.header('Content-Type', 'text/xml');
        res.send(data);
      })
      .catch(function (err) {
        console.log(err);
        next(err);
      });
});

module.exports = router;
