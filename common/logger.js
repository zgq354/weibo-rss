/**
 * Created by qing on 17-10-2.
 */
var log4js = require('log4js');

log4js.configure({
  appenders: {
    out: {
      type: 'stdout'
    },
    app: {
      type: 'file',
      filename: 'logs/weibo-rss.log',
      maxLogSize: 20480,
      backups: 3,
    }
  },
  categories: {
    default: { appenders: ['out', 'app'], level: 'info' }
  }
});

var logger = log4js.getLogger();

module.exports = logger;
