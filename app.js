var express = require('express');
var path = require('path');
var logger = require('./common/logger');

var rss = require('./routes/rss');
var index = require('./routes/index');

var app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/rss', rss);

logger.info(`weibo-rss start`);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send(err.status === 404 ? 'Not Found' : 'error happened');
});

module.exports = app;
