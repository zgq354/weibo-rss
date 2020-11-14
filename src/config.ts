/**
 * 配置文件加载相关
 */
import { existsSync } from "fs";
import { logger } from "./lib/logger";

const rootDir = `${__dirname}/../`;
let customConfig = {};

// 加载自定义配置
if (existsSync(`${rootDir}/config.js`)) {
  try {
    customConfig = require('../config');
  } catch (err) {
    logger.error('custom config load failed,', err);
  }
}

// 默认配置
const defaultConfig = {
  port: 3000, // 也可以在环境变量指定
  TTL: 15, // 微博加载延迟
};

/**
 * 程序初始化配置
 */
export default {
  ...defaultConfig,
  ...customConfig,
  rootDir, // 站点根路径
};
