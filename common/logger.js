/**
* Created by qing on 17-10-2.
*/

var logger = require('tracer').colorConsole({
  format : "[{{timestamp}}] [{{title}}] {{message}}",
});


module.exports = logger;
