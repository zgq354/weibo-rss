import { describe, expect, test } from "@jest/globals";
import { createDomainAPI } from "./domainAPI";

const testDomainMapList = [
  {
    domain: 'kaifulee',
    uid: '1197161814',
  },
  {
    domain: 'taobao',
    uid: '1682454721',
  },
  {
    domain: 'tmall',
    uid: '1768198384',
  },
];

describe('Domain API: domain to uid', () => {
  test('basic domain format', async () => {
    const { getUIDByDomain } = createDomainAPI();
    testDomainMapList.forEach(async (data) => {
      const resData = await getUIDByDomain(data.domain);
      expect(resData).toBe(data.uid);
    });
  });
});
