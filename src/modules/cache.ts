import LevelDOWN from "leveldown";
import levelUp, { LevelUp } from "levelup";
import { scheduleJob } from "node-schedule";
import path from "path";
import { LoggerInterface } from "../types";

// 缓存条目的结构
export interface CacheObject {
  created: number; // 缓存设置时的时间戳（毫秒）
  expire: boolean | number; // 有效期（秒），falsy 为不清理
  value: any;
};

// levelup 的错误类型
// https://github.com/Level/errors/blob/f5e5e406a5e325a8a62eb4d1135fa3d010816f8b/errors.js
export interface NotFoundError extends Error {
  notFound: boolean;
}

// 默认缓存目录
const DB_FOLDER = 'rss-data';

/**
 * LevelDB 实现的文件系统缓存
 */
export class LevelCache {
  private instance: LevelUp;
  private logger: LoggerInterface;

  constructor(dbPath: string, logger: LoggerInterface) {
    this.instance = levelUp(LevelDOWN(dbPath));
    this.logger = logger;
    this.startScheduleCleanJob();
  }

  static instance: LevelCache = null;

  static getInstance(dataBaseDir: string, logger: LoggerInterface) {
    if (!LevelCache.instance) {
      LevelCache.instance = new LevelCache(path.join(dataBaseDir, DB_FOLDER), logger);
    }
    return LevelCache.instance;
  }

  /**
   * 设置缓存
   * @param key 需缓存的 key
   * @param value key 对应的值
   * @param expire 过期时间（单位秒）
   */
  set(key: string, value: any, expire: number = 0) {
    this.logger.debug(`[cache] set ${key}`);
    return new Promise((resolve, reject) => {
      const data: CacheObject = {
        created: Date.now(),
        expire: !!expire,
        value,
      };
      if (expire) {
        data.expire = expire;
      }
      this.instance.put(key, JSON.stringify(data), (err) => {
        if (err) return reject(err);
        return resolve(true);
      });
    });
  }

  /**
   * 获取缓存的值
   * @param key 缓存对象的 key
   */
  get(key: string) {
    return new Promise((resolve, reject) => {
      this.instance.get(key, (err: NotFoundError, value) => {
        if (err) {
          if (err.notFound) {
            this.logger.debug(`[cache] get ${key} not found`);
            return resolve(null);
          }
          this.logger.error(`[cache] get ${key} error`, err);
          return reject(err);
        }
        try {
          const data = JSON.parse(String(value)) as CacheObject;
          if (this.checkExpired(data)) {
            // 过期缓存交给定时任务清理
            return resolve(null);
          } else {
            return resolve(data.value);
          }
        } catch (error) {
          this.logger.error(`[cache] parse ${key} error`, error);
          return reject(error);
        }
      });
    });
  }

  /**
   * 定期清理过期缓存
   */
  startScheduleCleanJob(rule: Parameters<typeof scheduleJob>[0] = "0 30 2 * * *") {
    // 每日凌晨两点半开始处理
    return scheduleJob(rule, () => {
      this.logger.info("[cache] cleaning start");
      let total = 0,
        deleted = 0;
      this.instance
        .createReadStream()
        .on("data", (item) => {
          total++;
          try {
            const data = JSON.parse(item.value.toString()) as CacheObject;
            if (this.checkExpired(data)) {
              deleted++;
              setTimeout(() => {
                this.instance.del(item.key, (err) => {
                  if (err) {
                    this.logger.error(`[cache] delete err key: ${item.key}`, err);
                  }
                });
              }, 0);
            }
          } catch (err) {
            this.logger.error("[cache] parse error", err);
          }
        })
        .on("end", function () {
          this.logger.info(
            "[cache] cleaning finished, total cnt:",
            total,
            "deleted cnt:",
            deleted
          );
        });
    });
  }

  private checkExpired(cacheItem: CacheObject) {
    return cacheItem.expire && Date.now() - cacheItem.created > +cacheItem.expire * 1000;
  }
}
