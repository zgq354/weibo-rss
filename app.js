var express = require('express');
var path = require('path');
var logger = require('morgan');

var weibo = require('./routes/weibo');

var app = express();

// app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/rss', weibo);

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
