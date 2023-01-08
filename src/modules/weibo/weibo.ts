import { CacheInterface, WeiboStatus, WeiboUserData } from "../../types";
import { createDetailAPI, createIndexAPI, createLongTextAPI } from "./api";

export class WeiboData {
  cache: CacheInterface;
  getIndexUserInfo: ReturnType<typeof createIndexAPI>['getIndexUserInfo'];
  getWeiboContentList: ReturnType<typeof createIndexAPI>['getWeiboContentList'];
  getWeiboDetail: ReturnType<typeof createDetailAPI>['getWeiboDetail'];
  getWeiboLongText: ReturnType<typeof createLongTextAPI>['getWeiboLongText'];

  constructor(cache: CacheInterface) {
    this.cache = cache;
    const { getIndexUserInfo, getWeiboContentList } = createIndexAPI();
    const { getWeiboDetail } = createDetailAPI();
    const { getWeiboLongText } = createLongTextAPI();
    this.getIndexUserInfo = getIndexUserInfo;
    this.getWeiboContentList = getWeiboContentList;
    this.getWeiboDetail = getWeiboDetail;
    this.getWeiboLongText = getWeiboLongText;
  }

  /**
   * get user's weibo
   */
  fetchUserLatestWeibo = async (uid: string) => {
    const indexInfo = await this.cacheMemo(() => this.getIndexUserInfo(uid), `info-${uid}`, 3 * 24 * 60 * 60);
    const { containerId } = indexInfo;
    const statusList = await this.cacheMemo(async () => {
      const wbList = await this.getWeiboContentList(uid, containerId);
      return await Promise.all(
        wbList.map(status => this.fillStatusWithLongText(status))
      );
    }, `list-${uid}-${containerId}`, 15 * 60);

    return {
      ...indexInfo,
      statusList,
    } as WeiboUserData;
  };

  /**
   * allow failure
   */
  fillStatusWithLongText = async (status: WeiboStatus) => {
    return status;
  };

  /**
   * memo in cache
   */
  private cacheMemo = async <T>(cb: () => T, key: string, expire = 0): Promise<Awaited<T>> => {
    const cacheResp = await this.cache.get(key);
    if (cacheResp) {
      return cacheResp as Awaited<T>;
    }
    const res = await cb();
    this.cache.set(key, res, expire);
    return res;
  }
}
