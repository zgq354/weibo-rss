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
      type: 'dateFile',
      filename: 'logs/weibo-rss',
      "alwaysIncludePattern": true,
      "pattern": "-yyyy-MM-dd.log"
    }
  },
  categories: {
    default: { appenders: ['out', 'app'], level: 'info' }
  }
});

var logger = log4js.getLogger();

module.exports = logger;
