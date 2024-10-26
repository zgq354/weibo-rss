import { describe, expect, test } from '@jest/globals';
import { WeiboData } from "./weibo";
import { WeiboStatus } from '../../types';

const wbData = new WeiboData({
  set: async () => null,
  get: async () => null,
  memo: async <T>(cb: () => T): Promise<Awaited<T>> => await cb(),
});

// TODO: more unit test about weibo data
describe('Weibo Data: user weibo profile and list', () => {
  const TEST_UID = '5890672121';

  // 获取用户名 + 微博列表
  test('fetch user weibo profile and list success', async () => {
    const resData = await wbData.fetchUserLatestWeibo(TEST_UID);
    expect(resData.uid).toBe(TEST_UID);
    expect(resData.screenName).toBe('搜狐新闻');
    expect(resData.statusList).toBeDefined();
  });

  // 长文本的填充
  test('fetch weibo with long text', async () => {
    const resData = await wbData.fillStatusWithLongText({
      id: '5093426468489917',
      isLongText: true,
    } as WeiboStatus);
    expect(resData.text).toContain('中微子是宇宙形成之初就存在的最古老也最原始的基本粒子');
  });
});

describe('Weibo Data: domain to uid', () => {
  test('basic domain format', async () => {
    const resData = await wbData.fetchUIDByDomain('kaifulee');
    expect(resData).toBe('1197161814');
  });
});
