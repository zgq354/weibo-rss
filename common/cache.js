/**
* Created by qing on 17-10-2.
*/
var path = require('path');
var logger = require('./logger');
var levelup = require('levelup');
var leveldown = require('leveldown');
var schedule = require('node-schedule');

// 缓存数据文件名
const DB_FILENAME = 'rss-data';

// LevelDB instance
var db = levelup(leveldown(path.join('data', DB_FILENAME)));

// 删除过期缓存的计划任务
schedule.scheduleJob("0 30 2 * * *", function () {
  logger.info('Cache cleaning start');
  // 统计
  var total = 0, deleted = 0;
  // 遍历缓存条目
  db.createReadStream()
    .on('data', function (item) {
      total++;
      var data = JSON.parse(item.value.toString());
      // 删除已经过期的缓存
      if (data.expire && Date.now() - data.created > data.expire * 1000) {
        deleted++;
        db.del(item.key, function (error) {
          if (error)
            logger.error('Cache delete err: ' + item.key + ' ' + error);
        });
      }
    })
    .on('end', function () {
      logger.info('Cache cleaning finished, total:', total, 'deleted:', deleted);
    });
});

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
    // logger.info('Set cache: ' + key);
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
