import { Throttler } from "../../throttler";
import Axios from "axios";
import { Agent } from "https";
import { handleForbiddenErr, MOCK_UA, TIME_OUT } from "./common";
import { logger } from "../../logger";
import { waitMs } from "../../../utils";

export class DomainNotFoundError extends Error {
  constructor(domain: string) {
    super(`domain: ${domain}`);
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

export type GetUIDByDomainFunc = ReturnType<typeof createDomainAPI>['getUIDByDomain'];
