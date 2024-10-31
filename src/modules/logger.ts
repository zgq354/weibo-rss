/**
 * 日志模块，生成对应格式日志输出到控制台
 */
import * as tracer from 'tracer';

export const debug = process.env.DEBUG;

export const logger = tracer.colorConsole({
  format : "[{{timestamp}}] [{{title}}] {{message}}",
  level: debug ? 'debug' : 'info',
});
