/**
 * TODO: add unit test
 */
import { WeiboData } from "./weibo";

(async () => {
  const wbData = new WeiboData({
    set: async () => null,
    get: async () => null,
  });

  const data = await wbData.fetchUserLatestWeibo('5890672121');
  console.log(data.statusList[0].pics);
})();
