import { describe, expect, test } from '@jest/globals';
import { WeiboData } from "./weibo";

const wbData = new WeiboData({
  set: async () => null,
  get: async () => null,
  memo: async <T>(cb: () => T): Promise<Awaited<T>> => await cb(),
});

// TODO: add more unit test about weibo api
describe('Weibo Data: user weibo list', () => {
  const TEST_UID = '5890672121';
  test('fetch user weibo list success', async () => {
    const resData = await wbData.fetchUserLatestWeibo(TEST_UID);
    expect(resData.uid).toBe(TEST_UID);
    expect(resData.screenName).toBe('搜狐新闻');
    expect(resData.statusList).toBeDefined();
  });
});

describe('Weibo Data: domain to uid', () => {
  test('basic domain format', async () => {
    const resData = await wbData.fetchUIDByDomain('kaifulee');
    expect(resData).toBe('1197161814');
  });
});
