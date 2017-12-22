/**
* Created by qing on 17-10-12.
*/
var express = require('express');
var weibo = require('../common/weibo');

var router = express.Router();

// 首页
router.get('/', function (req, res, next) {
  res.sendFile('public/index.html');
});

// 通过用微博个性域名查找uid
router.get('/convert', function (req, res, next) {
  var domain = req.query['domain'];
  if (!domain || !/^[A-Za-z0-9]{4,20}$/.test(domain)) {
    res.send({
      success: false,
      msg: '参数不合法'
    });
  } else {
    weibo.getUIDByDomain(domain)
    .then(function (uid) {
      res.send({
        success: true,
        uid: uid
      });
    })
    .catch(function (err) {
      res.send({
        success: false,
        msg: '获取数据时发生了错误'
      });
    });
  }
});

module.exports = router;
