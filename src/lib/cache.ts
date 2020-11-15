/**
 * levelDB 缓存模块，提供读取与写入的接口，并每天定期清理
 */
import path from 'path';
import levelDOWN from "leveldown";
import levelUp from "levelup";
import { scheduleJob } from 'node-schedule';
import { logger } from './logger';
import config from '../config';

// 缓存目录
const DB_FOLDER = 'rss-data';

// LevelDB instance
const levelInstance = levelUp(levelDOWN(path.join(config.rootDir, 'data', DB_FOLDER)));

// 缓存条目的结构
interface CacheObject {
  created: number; // 缓存设置时间戳（毫秒）
  expire: boolean | number; // 过期时间（秒）
  value: any; // 数据值
};

/**
 * 设置缓存
 * @param key 需缓存的 key
 * @param value key 对应的值
 * @param expire 过期时间（单位秒）
 */
export function set(key: string, value: any, expire: number = 0) {
  logger.debug(`[cache] set ${key}`);
  return new Promise((resolve, reject) => {
    const data: CacheObject = {
      created: Date.now(),
      expire: !!expire,
      value,
    };
    if (expire) {
      data.expire = expire;
    }
    levelInstance.put(key, JSON.stringify(data), (err) => {
      if (err) return reject(err);
      return resolve(true);
    });
  });
}

// levelup 的错误类型
// https://github.com/Level/errors/blob/f5e5e406a5e325a8a62eb4d1135fa3d010816f8b/errors.js
interface NotFoundError extends Error {
  notFound: boolean;
}

// 检查是否过期
function checkExpired(cacheItem: CacheObject) {
  return cacheItem.expire && Date.now() - cacheItem.created > +cacheItem.expire * 1000;
}

/**
 * 获取缓存的值
 * @param key 缓存对象的 key
 */
export function get(key: string) {
  return new Promise((resolve, reject) => {
    levelInstance.get(key, (err: NotFoundError, value) => {
      if (err) {
        if (err.notFound) {
          logger.debug(`[cache] get ${key} not found`);
          return resolve(null);
        }
        logger.error(`[cache] get ${key} error`, err);
        return reject(err);
      }
      try {
        const data = JSON.parse(String(value)) as CacheObject;
        if (checkExpired(data)) {
          // 过期缓存交给定时任务清理
          return resolve(null);
        } else {
          return resolve(data.value);
        }
      } catch (error) {
        logger.error(`[cache] parse ${key} error`, error);
        return reject(error);
      }
    });
  });
}

// 定期清理过期缓存
// 凌晨两点半开始处理
scheduleJob("0 30 2 * * *", () => {
  logger.info("cache cleaning start");
  let total = 0,
    deleted = 0;
  levelInstance
    .createReadStream()
    .on("data", (item) => {
      total++;
      try {
        const data = JSON.parse(item.value.toString()) as CacheObject;
        if (checkExpired(data)) {
          deleted++;
          // 塞到下个 macroTask，避免阻塞任务
          setTimeout(() => {
            levelInstance.del(item.key, (err) => {
              if (err) {
                logger.error(`Cache delete err key: ${item.key}`, err);
              }
            });
          }, 0);
        }
      } catch (err) {
        logger.error("cache parse error", err);
      }
    })
    .on("end", function () {
      logger.info(
        "Cache cleaning finished, total:",
        total,
        "deleted:",
        deleted
      );
    });
});

export default {
  set,
  get,
};
