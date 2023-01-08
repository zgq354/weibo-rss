import { CacheInterface, LoggerInterface, WeiboStatus, WeiboUserData } from "../../types";
import { logger } from "../logger";
import { createDetailAPI, createIndexAPI, createLongTextAPI } from "./api";

export class WeiboData {
  cache: CacheInterface;
  logger: LoggerInterface;
  getIndexUserInfo: ReturnType<typeof createIndexAPI>['getIndexUserInfo'];
  getWeiboContentList: ReturnType<typeof createIndexAPI>['getWeiboContentList'];
  getWeiboDetail: ReturnType<typeof createDetailAPI>['getWeiboDetail'];
  getWeiboLongText: ReturnType<typeof createLongTextAPI>['getWeiboLongText'];

  constructor(cache: CacheInterface, log: LoggerInterface = logger) {
    this.cache = cache;
    this.logger = logger;
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
    }, `list-${uid}`, 15 * 60);

    return {
      ...indexInfo,
      statusList,
    } as WeiboUserData;
  };

  /**
   * allow failure
   */
  fillStatusWithLongText = async (status: WeiboStatus) => {
    let newStatus = status;
    try {
      if (status.isLongText) {
        try {
          const longTextContent = await this.cacheMemo(
            () => this.getWeiboLongText(status.id),
            `long-${status.id}`,
            7 * 24 * 60 * 60,
          );
          newStatus = {
            ...status,
            text: longTextContent
          };
        } catch (error) {
          logger.error(error);
          // fallback to detail
          newStatus = await this.cacheMemo(
            () => this.getWeiboDetail(status.id),
            `dt-${status.id}`,
            7 * 24 * 60 * 60,
          );
        }
      }
      // 转发的微博全文
      if (status.retweeted_status) {
        newStatus = {
          ...status,
          retweeted_status: await this.fillStatusWithLongText(status.retweeted_status),
        }
      }
    } catch (error) {
      logger.error(error);
    }
    return newStatus;
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

export const statusToHTML = (status: WeiboStatus) => {
  let tempHTML = status.text;
  // 表情转文字
  tempHTML = tempHTML.replace(/<span class="url-icon"><img alt="?(.*?)"? src=".*?" style="width:1em; height:1em;".*?\/><\/span>/g, '$1');
  // 去掉外链图标
  tempHTML = tempHTML.replace(/<span class='url-icon'><img.*?><\/span>/g, '');

  // 转发的微博
  if (status.retweeted_status) {
    tempHTML += "<br><br>";
    // 可能有转发的微博被删除的情况
    if (status.retweeted_status.user) {
      tempHTML += '<div style="border-left: 3px solid gray; padding-left: 1em;">' +
        '转发 <a href="https://weibo.com/' + status.retweeted_status.user.id + '" target="_blank">@' + status.retweeted_status.user.screen_name + '</a>: ' +
        statusToHTML(status.retweeted_status) +
        '</div>';
    }
  }

  // 微博配图
  if (status.pics) {
    status.pics.forEach(function (item) {
      tempHTML += "<br><br>";
      tempHTML += '<a href="' + item.large.url + '" target="_blank"><img src="' + item.url + '"></a>';
    });
  }

  return tempHTML;
}
