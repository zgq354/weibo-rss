/**
* Created by qing on 17-10-2.
*/
var path = require('path');
var logger = require('./logger');
var levelup = require('levelup');
var leveldown = require('leveldown');

// 缓存数据文件名
const DB_FILENAME = 'rss-data';

var db = levelup(leveldown(path.join('data', DB_FILENAME)));

module.exports.set = function (key, value, expire) {
  return new Promise(function(resolve, reject) {
    // 缓存数据，包括缓存时间的设定
    var data = {
      created: Date.now(),
      expire: !!expire,
      value: value
    };
    // 过期设置
    if (expire) {
      data.expire = expire;
    }
    // 设置缓存
    db.put(key, JSON.stringify(data), function (err) {
      if (err) return reject(err);
    });
    logger.info('Set cache: ' + key);
  });
};

module.exports.get = function (key) {
  return new Promise(function(resolve, reject) {
    db.get(key, function (err, value) {
      if (err) {
        if (err.notFound) {
          resolve();
          return;
        }
        return reject(err);
      }
      var data = JSON.parse(value);
      // 检查过期
      if (data.expire && Date.now() - data.created > data.expire * 1000) {
        resolve();
      } else {
        resolve(data.value);
      }
    });
  });
};
