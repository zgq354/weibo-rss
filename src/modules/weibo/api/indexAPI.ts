import { Throttler } from "../../throttler";
import Axios from "axios";
import { Agent } from "https";
import { handleForbiddenErr, MOCK_UA, TIME_OUT } from "./common";
import { WeiboStatus, WeiboUserData } from "../../../types";
import { logger } from "../../logger";
import { waitMs } from "../../../utils";

export class UserNotFoundError extends Error {
  constructor(uid: string) {
    super(`uid: ${uid}`);
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

export type GetIndexUserInfoFunc = ReturnType<typeof createIndexAPI>['getIndexUserInfo'];

export type GetWeiboContentListFunc = ReturnType<typeof createIndexAPI>['getWeiboContentList'];
