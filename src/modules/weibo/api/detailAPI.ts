import { Throttler } from "../../throttler";
import Axios from "axios";
import { Agent } from "https";
import { handleForbiddenErr, MOCK_UA, TIME_OUT } from "./common";
import { logger } from "../../logger";
import { waitMs } from "../../../utils";

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
