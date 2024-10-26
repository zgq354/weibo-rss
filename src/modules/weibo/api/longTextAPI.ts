import { Throttler } from "../../throttler";
import Axios from "axios";
import { Agent } from "https";
import { handleForbiddenErr, MOCK_UA, TIME_OUT } from "./common";
import { logger } from "../../logger";
import { waitMs } from "../../../utils";

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
        if (!data.data) {
          throw new Error(JSON.stringify(data));
        }
        return data.data.longTextContent;
      }).catch(err => handleForbiddenErr(err, disable));
    }),
  };
};

export type GetWeiboLongTextFunc = ReturnType<typeof createLongTextAPI>['getWeiboLongText'];
