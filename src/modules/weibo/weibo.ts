import config from "../../config";
import { CacheInterface, LoggerInterface, WeiboStatus, WeiboUserData } from "../../types";
import { logger } from "../logger";
import { createDetailAPI, createDomainAPI, createIndexAPI, createLongTextAPI } from "./api";

export class WeiboData {
  cache: CacheInterface;
  logger: LoggerInterface;
  getIndexUserInfo: ReturnType<typeof createIndexAPI>['getIndexUserInfo'];
  getWeiboContentList: ReturnType<typeof createIndexAPI>['getWeiboContentList'];
  getWeiboDetail: ReturnType<typeof createDetailAPI>['getWeiboDetail'];
  getWeiboLongText: ReturnType<typeof createLongTextAPI>['getWeiboLongText'];
  getUIDByDomain: ReturnType<typeof createDomainAPI>['getUIDByDomain'];

  constructor(cache: CacheInterface, log: LoggerInterface = logger) {
    this.cache = cache;
    this.logger = log;
    const { getIndexUserInfo, getWeiboContentList } = createIndexAPI();
    const { getWeiboDetail } = createDetailAPI();
    const { getWeiboLongText } = createLongTextAPI();
    const { getUIDByDomain } = createDomainAPI();
    this.getIndexUserInfo = getIndexUserInfo;
    this.getWeiboContentList = getWeiboContentList;
    this.getWeiboDetail = getWeiboDetail;
    this.getWeiboLongText = getWeiboLongText;
    this.getUIDByDomain = getUIDByDomain;
  }

  /**
   * get user's weibo
   */
  fetchUserLatestWeibo = async (uid: string) => {
    const indexInfo = await this.cache.memo(() => this.getIndexUserInfo(uid), `info-${uid}`, config.cacheTTL.apiIndexInfo);
    const { containerId } = indexInfo;
    const statusList = await this.cache.memo(async () => {
      const wbList = await this.getWeiboContentList(uid, containerId);
      return await Promise.all(
        wbList.map(status => this.fillStatusWithLongText(status))
      );
    }, `list-${uid}`, config.cacheTTL.apiStatusList);

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
          const longTextContent = await this.cache.memo(
            () => this.getWeiboLongText(status.id),
            `long-${status.id}`,
            config.cacheTTL.apiLongText,
          );
          newStatus = {
            ...status,
            text: longTextContent
          };
        } catch (error) {
          logger.error(error, `uid: ${status?.user?.id}, status: ${status.id}`);
          // fallback to detail
          newStatus = await this.cache.memo(
            () => this.getWeiboDetail(status.id),
            `dt-${status.id}`,
            config.cacheTTL.apiDetail,
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
      logger.error(error, `uid: ${status?.user?.id}, status: ${status.id}`);
    }
    return newStatus;
  };

  /**
   * domain -> uid
   */
  fetchUIDByDomain = async (domain: string) => this.getUIDByDomain(domain);
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
      var url = config.imageCache ? (config.imageCache + encodeURIComponent(item.url)) : item.url;
      let largeUrl = config.imageCache ? (config.imageCache + encodeURIComponent(item.large.url)) : item.large.url;
      tempHTML += '<a href="' + largeUrl + '" target="_blank"><img src="' + url+ '"></a>';
    });
  }

  return tempHTML;
}
