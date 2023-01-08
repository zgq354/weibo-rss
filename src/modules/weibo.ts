import Axios from "axios";
import { Agent } from "https";
import { waitMs } from "../utils";
import { Throttler } from "./throttler";

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
    timeout: 3000,
    httpsAgent
  });

  return {
    getIndexUserInfo: (uid: string) => runner.runFunc(async (disable) => {
      await waitMs(Math.floor(Math.random() * 100));
      return await axiosInstance({
        method: 'get',
        url: `https://m.weibo.cn/api/container/getIndex?type=uid&value=${uid}`,
        headers: {
          'MWeibo-Pwa': 1,
          'Referer': `https://m.weibo.cn/u/${uid}`,
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }).then(({ data }) => {
        if (data.ok !== 1) {
          return Promise.reject(new UserNotFoundError(uid));
        }
        const result = {
          uid,
          screen_name: data.data.userInfo.screen_name,
          description: data.data.userInfo.description,
          containerId: data.data.tabsInfo.tabs[1].containerid,
        };
        return result;
      }).catch(err => {
        if (err.response && [418, 403].includes(err.response.status)) {
          return disable();
        } else {
          return Promise.reject(err);
        }
      });
    }),
    getWeiboContentList: (uid: string, containerId: string) => runner.runFunc(async (disable) => {
      await waitMs(Math.floor(Math.random() * 100));
      return await axiosInstance({
        method: 'get',
        url: `https://m.weibo.cn/api/container/getIndex?type=uid&value=${uid}&containerid=${containerId}`,
        headers: {
          'MWeibo-Pwa': 1,
          'Referer': `https://m.weibo.cn/u/${uid}`,
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }).then(({ data }) => {
        return data.data.cards.filter(item => item.mblog);
      }).catch(err => {
        if (err.response && [418, 403].includes(err.response.status)) {
          return disable();
        } else {
          return Promise.reject(err);
        }
      });
    }),
  };
};
