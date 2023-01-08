/**
 * 配置文件加载相关
 */
import { existsSync } from "fs";
import { logger } from "./modules/logger";

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
  // 程序监听的 TCP 端口，也可以在环境变量指定
  port: '3000',
  // 输出 rss feed 文本的 ttl 字段（分钟为单位）
  rssTTL: 15,
  // 真正的缓存配置，具体关注代码（秒为单位）
  cacheTTL: {
    rssXml: 15 * 60,
    apiStatusList: 15 * 60,
    apiIndexInfo: 3 * 24 * 60 * 60,
    apiLongText: 7 * 24 * 60 * 60,
    apiDetail: 7 * 24 * 60 * 60,
    apiDomain: 7 * 24 * 60 * 60,
  },
};

/**
 * 自定义配置
 */
export default {
  ...defaultConfig,
  ...customConfig,
  rootDir, // 站点根路径
};
