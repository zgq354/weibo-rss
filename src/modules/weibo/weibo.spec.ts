/**
 * TODO: add unit test
 */
import { WeiboData } from "./weibo";

(async () => {
  const wbData = new WeiboData({
    set: async () => null,
    get: async () => null,
    memo: async <T>(cb: () => T): Promise<Awaited<T>> => await cb(),
  });

  const data = await wbData.fetchUserLatestWeibo('5890672121');
  console.log(data);
})();
