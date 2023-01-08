import { Tracer } from "tracer";

export interface RSSKoaContext {
  cache: CacheInterface;
}

export type LoggerInterface = Tracer.Logger<string>;

export interface CacheInterface {
  set: (key: string, value: any, expire: number) => Promise<void>;
  get: (key: string) => any;
}

export interface WeiboStatus {
  // eg: '4851725594528288'
  id: string;
  // eg: '4851725594528288'
  mid: string;
  // eg: 'MlHCnj00U'
  bid: string;
  // time
  created_at: string;
  // text
  text: string;
  isLongText: boolean;
  user: {
    id: number,
    screen_name: string,
    profile_url: string;
    description: string;
    // more...
    [x: string]: any;
  },
  // pics
  pic_ids: string[];
  thumbnail_pic: string;
  bmiddle_pic: string;
  original_pic: string;
  pics: {
    pid: string,
    url: string,
    size: 'orj360' | 'large',
    large: {
      size: 'orj360' | 'large',
      url: string,
    }
  }[];
  // video and other data
  page_info?: {
    type: 'video' | 'search_topic';
    // eg: 'http://t.cn/A6K3ITkN'
    url_ori: string;
    // eg: '搜狐新闻的微博视频'
    page_title: string;
    // eg: '2022触动瞬间'
    title: string;
    // eg: '搜狐新闻的微博视频'
    content1: string;
    content2: string;
    // more...
    [x: string]: any;
  };
  retweeted_status?: WeiboStatus;
  [x: string]: any;
}

export interface WeiboUserData {
  uid: string,
  screenName: string,
  description: string,
  containerId?: string,
  statusList?: WeiboStatus[],
}
