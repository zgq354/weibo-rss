import config from '../config';
import cache from '../lib/cache';
import { logger } from '../lib/logger';

// 缓存配置
const { cache: cacheConfig } = config;

// 用户可能的状态
enum UserStatus {
  NOT_FOUND,
  UID_FORMAT_ERR,
  NO_DATA,
};

// RSS 缓存的数据结构
interface XMLCacheObj {
  lastTime: number; // 写入时的时间
  XMLData: string; // RSS XML 字符串
}

/**
 * 获取微博对应的 RSS XML
 * @param ctx Koa Context
 */
export default async function getWeiboRSS(ctx) {
  const uid = ctx.params['id'];
  const ip = ctx.ip;

  let startTime = Date.now();
  let hitCache = 0;
  try {
    // 先从缓存获取
    const cachePrefix = cacheConfig.RSSXML.prefix;
    const cacheKey = `${cachePrefix}-${uid}`;
    const { lastTime, XMLData } =
      ((await cache.get(cacheKey)) as XMLCacheObj | null) || {};

    // 无需向后方请求刷新的情况
    if (lastTime && Date.now() - lastTime > config.TTL * 1000) {
      hitCache = 1;
      // send data
      ctx.set('Content-Type', 'text/xml');
      ctx.body = XMLData;
    } else {
      // 未拉到缓存，向后方请求刷新
      // TODO: 实现后方抓取逻辑
      const { fetchSuccess, userNotFound, resultXML } = await Promise.resolve({
        fetchSuccess: false,
        userNotFound: false,
        resultXML: "",
      });
      // 需报错情况：
      // 1. 未拉取成功，且缓存不存在
      // 2. 拉取成功，用户不存在
      if (!fetchSuccess && !XMLData) {
        throw UserStatus.NO_DATA;
      } else if (fetchSuccess && userNotFound) {
        const { prefix, ttl } = config.cache.NOT_FOUND;
        cache.set(`${prefix}-${uid}`, true, ttl);
        throw UserStatus.NOT_FOUND;
      }
      // send data
      ctx.set('Content-Type', 'text/xml');
      // 拉取成功，用户存在的情况下 resultXML 也会有对应拉取数据
      // 未拉取成功则直接返回缓存（后方在 worker 完成工作后会自动更新缓存）
      ctx.body = resultXML || XMLData;
    }
    logger.info(`hit: ${hitCache}, ${Date.now() - startTime}ms, get ${uid} ${ip}`);
  } catch (error) {
    return errorHandler(ctx, error);
  }
}

/**
 * 检查 UID 是否符合规则，确认用户是否存在
 */
export async function checkWeiboUID(ctx, next) {
  const uid = ctx.params['id'];
  try {
    // check uid format
    if (!/^[0-9]{10}$/.test(uid)) {
      throw UserStatus.UID_FORMAT_ERR;
    }
    const cachePrefix = cacheConfig.NOT_FOUND.prefix;
    if (await cache.get(`${cachePrefix}-${uid}`)) {
      throw UserStatus.NOT_FOUND;
    }
    await next();
  } catch (err) {
    return errorHandler(ctx, err);
  }
}

function errorHandler(ctx, error) {
  const uid = ctx.params['id'];
  const ip = ctx.ip;
  if (error === UserStatus.NOT_FOUND) {
    ctx.status = 404;
    ctx.body = `找不到用户，可能是 UID 出错，或者用户微博未登录不可见。uid: ${uid}`;
  } else if (error === UserStatus.UID_FORMAT_ERR) {
    ctx.status = 404;
    ctx.body = `找不到用户，UID 格式有误。uid: ${uid}`;
  } else if (error === UserStatus.NO_DATA) {    
    ctx.status = 404;
    ctx.body = `已触发请求动作，暂未拉取到数据，请稍后再试。uid: ${uid}`;
  } else {
    logger.error(`${error} - uid: ${uid} - IP: ${ip}`);
    if (error.stack) logger.error(error.stack);
  }
}
