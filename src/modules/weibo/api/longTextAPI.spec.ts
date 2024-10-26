import { describe, expect, test } from "@jest/globals";
import { createLongTextAPI } from "./longTextAPI";

const testDataList = [{
  id: '5093426468489917',
  text: '中微子是宇宙形成之初就存在的最古老也最原始的基本粒子',
}, {
  id: '5093698779485067',
  text: '无论如何，「AI God」的拍卖再次引发了人们对传统艺术与数字艺术的思考',
}];

describe ('Weibo API: longTextAPI', () => {
  test('fetch long text', async () => {
    const { getWeiboLongText } = createLongTextAPI();
    for (const data of testDataList) {
      const resData = await getWeiboLongText(data.id);
      expect(resData).toContain(data.text);
    }
  });
});
