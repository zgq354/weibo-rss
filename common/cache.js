/**
* Created by qing on 17-10-2.
*/
var logger = require('./logger');
var redis = require('redis');
var Q = require('bluebird');

Q.promisifyAll(redis.RedisClient.prototype);
Q.promisifyAll(redis.Multi.prototype);

var config = {
  host: process.env.REDIS_PORT_6379_TCP_ADDR,
  port: process.env.REDIS_PORT_6379_TCP_PORT
};

if (process.env.REDIS_PASSWORD) {
  config.password = process.env.REDIS_PASSWORD
}

var client;
if (process.env.REDIS_PORT_6379_TCP_ADDR && process.env.REDIS_PORT_6379_TCP_PORT) {
  client = redis.createClient(config);
} else {
  client = redis.createClient();
}

client.on("error", function (err) {
  logger.error('Redis Error ' + err);
});

module.exports.set = function (key, value, expire = 300) {
  client.set(key, value, redis.print);
  client.expire(key, expire);
  logger.info('Set redis: ' + key);
};

module.exports.get = function (key) {
  return client.getAsync(key);
};
