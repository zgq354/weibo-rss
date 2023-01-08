/**
 * TODO: add unit test
 */
import { WeiboData } from "./weibo";

(async () => {
  const wbData = new WeiboData({
    set: async (key) => console.log(key),
    get: async () => null,
  });

  // const data = await wbData.fetchUserLatestWeibo('5890672121');
  // const data = await wbData.fetchUserLatestWeibo('7309016789');
  const data = await wbData.fetchUserLatestWeibo('73090167890');
  console.log(data);
})();
