import Axios, { AxiosError } from "axios";
import { Agent } from "https";
import { WeiboStatus, WeiboUserData } from "../../types";
import { waitMs } from "../../utils";
import { logger } from "../logger";
import { Throttler } from "../throttler";

export const TIME_OUT = 3000;
export const MOCK_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

export const handleForbiddenErr = (err: AxiosError, cb: () => Promise<void>) => {
  if (err.response && [418, 403].includes(err.response.status)) {
    return cb();
  } else {
    return Promise.reject(err);
  }
}

export class UserNotFoundError extends Error {
  constructor(uid: string) {
    super(`uid: ${uid}`);
    this.name = this.constructor.name;
  }
}

export const createIndexAPI = () => {
  const runner = new Throttler('index');
  const httpsAgent = new Agent({ keepAlive: true });
  const axiosInstance = Axios.create({
    timeout: TIME_OUT,
    httpsAgent
  });

  return {
    getIndexUserInfo: (uid: string) => runner.runFunc<WeiboUserData>(async (disable) => {
      logger.debug(`[getInfo] ${uid}`);
      await waitMs(Math.floor(Math.random() * 100));
      return await axiosInstance({
        method: 'get',
        url: `https://m.weibo.cn/api/container/getIndex?type=uid&value=${uid}`,
        headers: {
          'MWeibo-Pwa': 1,
          'Referer': `https://m.weibo.cn/u/${uid}`,
          'User-Agent': MOCK_UA,
          'X-Requested-With': 'XMLHttpRequest'
        }
      }).then(({ data }) => {
        if (data.ok !== 1) {
          return Promise.reject(new UserNotFoundError(uid));
        }
        const result = {
          uid,
          screenName: data.data.userInfo.screen_name,
          description: data.data.userInfo.description,
          containerId: data.data.tabsInfo.tabs[1].containerid,
        };
        return result;
      }).catch(err => handleForbiddenErr(err, disable));
    }),
    getWeiboContentList: (uid: string, containerId: string) => runner.runFunc<WeiboStatus[]>(async (disable) => {
      logger.debug(`[getContList] ${uid} ${containerId}`);
      await waitMs(Math.floor(Math.random() * 100));
      return await axiosInstance({
        method: 'get',
        url: `https://m.weibo.cn/api/container/getIndex?type=uid&value=${uid}&containerid=${containerId}`,
        headers: {
          'MWeibo-Pwa': 1,
          'Referer': `https://m.weibo.cn/u/${uid}`,
          'User-Agent': MOCK_UA,
          'X-Requested-With': 'XMLHttpRequest'
        }
      }).then(({ data }) => {
        return data.data.cards
          .filter(item => item.mblog)
          .map(item => item.mblog);
      }).catch(err => handleForbiddenErr(err, disable));
    }),
  };
};

export const createDetailAPI = () => {
  const runner = new Throttler('detail');
  const httpsAgent = new Agent({ keepAlive: true });
  const axiosInstance = Axios.create({
    timeout: TIME_OUT,
    httpsAgent
  });
  return {
    getWeiboDetail: (id: string) => runner.runFunc(async (disable) => {
      logger.debug(`[getDetail] ${id}`);
      await waitMs(Math.floor(Math.random() * 100));
      return await axiosInstance({
        method: 'get',
        url: `https://m.weibo.cn/statuses/show?id=${id}`,
        headers: {
          'MWeibo-Pwa': 1,
          'Referer': `https://m.weibo.cn/detail/${id}`,
          'User-Agent': MOCK_UA,
          'X-Requested-With': 'XMLHttpRequest'
        },
      }).then(({ data }) => {
        return data.data;
      }).catch(err => handleForbiddenErr(err, disable));
    }),
  };
}

export const createLongTextAPI = () => {
  const runner = new Throttler('longText');
  const httpsAgent = new Agent({ keepAlive: true });
  const axiosInstance = Axios.create({
    timeout: TIME_OUT,
    httpsAgent
  });
  return {
    getWeiboLongText: (id: string) => runner.runFunc<string>(async (disable) => {
      logger.debug(`[longText] ${id}`);
      await waitMs(Math.floor(Math.random() * 100));
      return await axiosInstance({
        method: 'get',
        url: `https://m.weibo.cn/statuses/extend?id=${id}`,
        headers: {
          'MWeibo-Pwa': 1,
          'Referer': `https://m.weibo.cn/detail/${id}`,
          'User-Agent': MOCK_UA,
          'X-Requested-With': 'XMLHttpRequest'
        },
      }).then(({ data }) => {
        return data.data.longTextContent;
      }).catch(err => handleForbiddenErr(err, disable));
    }),
  };
};

export class DomainNotFoundError extends Error {
  constructor(domain: string) {
    super(`domain: ${domain}`);
    this.name = this.constructor.name;
  }
}

export const createDomainAPI = () => {
  const runner = new Throttler('domain');
  const httpsAgent = new Agent({ keepAlive: true });
  const axiosInstance = Axios.create({
    timeout: TIME_OUT,
    httpsAgent
  });

  return {
    getUIDByDomain: (domain: string) => runner.runFunc<string>(async (disable) => {
      logger.debug(`[domain] convert ${domain}`);
      await waitMs(Math.floor(Math.random() * 100));
      return await axiosInstance.get(`https://m.weibo.cn/${domain}?&jumpfrom=weibocom`, {
        headers: {
          'User-Agent': MOCK_UA,
        },
      }).then(res => {
        const uid = res.request.path.split("/u/")[1] as string;
        if (!uid) {
          throw new DomainNotFoundError(domain);
        }
        return uid;
      }).catch(err => handleForbiddenErr(err, disable));
    }),
  };
};
