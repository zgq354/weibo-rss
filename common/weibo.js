/**
* Created by qing on 17-10-1.
*/
var axios = require('axios');
var RSS = require('rss');
var logger = require('./logger');
var cache = require('./cache');
var Queue = require('np-queue');

const q = new Queue({
  concurrency: 3
});

const API_URL = 'https://m.weibo.cn/api/container/getIndex';
const DETAIL_URL = 'https://m.weibo.cn/status/';
const DETAIL_API_URL = 'https://m.weibo.cn/statuses/show?id=';
const PROFILE_URL = 'https://weibo.com/';

exports.fetchRSS = function(uid) {
  return new Promise(function (resolve, reject) {
    var feed; // feed 对象

    // 第一步，获取用户的信息
    getUserInfo(uid).then(function (data) {

      // 初始化 feed对象
      feed = new RSS({
        site_url: PROFILE_URL + data.userInfo.id,
        title: data.userInfo.screen_name + '的微博',
        description: data.userInfo.description,
        generator: 'https://github.com/zgq354/weibo-rss',
        ttl: 15
      });

      // 获取container id
      const containerId = data.containerId;
      // 下一步，获取用户最近的微博
      return q.add(function () {
        return axios.get(API_URL, {
          params: {
            type: 'uid',
            value: uid,
            containerid: containerId
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
          }
        });
      });
    }).then(function (res) {
      const data = res.data || {};
      const cards = data.cards || data.data.cards || {};

      // 过滤掉多余的card
      var list = cards.filter(function (item) {
        return item.card_type == 9;
      });

      // 获取微博内容
      var listPromises = [];
      list.forEach(function (item) {
        listPromises.push(getDetials(item.mblog.id, uid));
      });

      // 下一步：处理构造好的Promise的并发请求结果
      return Promise.all(listPromises);
    }).then(function (resArr) {
      resArr.forEach(function (data) {
        // 解决因为用户某些微博被屏蔽站外访问而导致整个 RSS 返回 Not Found 的问题
        // 具体表现：直接打开该微博链接，提示“微博部分内容不支持站外查看，请使用官方客户端获取内容。”
        // 也是很无奈呢，面对这越来越封闭的互联网
        if (!data) return;

        // 构造feed中的item
        feed.item({
          title: data.status_title,
          description: formatStatus(data),
          url: DETAIL_URL + data.id,
          guid: DETAIL_URL + data.id,
          date: new Date(data.created_at)
        });
      });

      // 成功的情况
      resolve(feed.xml());
    }).catch(function (err) {
      // 出错的情况
      reject(err);
    })
  });
};

// 通过用户的个性域名获取UID
exports.getUIDByDomain = function (domain) {
  return new Promise(function (resolve, reject) {
    // 向微博发出请求,利用手机版的跳转获取containerid
    axios.get(PROFILE_URL + domain, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
      }
    }).then(function (data) {
      // console.log(data.request.path);
      const containerId = data.request.path.split("/p/")[1];
      // 下一步：通过containerid获取uid
      return axios.get(API_URL, {params: { containerid: containerId }});
    }).then(function (res) {
      const data = res.data.ok ? res.data.data : res.data;
      const uid = data.userInfo.id;
      resolve(uid);
    }).catch(function (err) {
      reject(err);
    });
  });
};

// 获取用户信息
// 缓存时间24小时
function getUserInfo(uid) {
  return new Promise(function(resolve, reject) {
    var key = `weibo-rss-info-${uid}`;
    cache.get(key).then(function (result) {
      if (result) {
        resolve(JSON.parse(result));
      } else {
        q.add(function () {
          return axios.get(API_URL, {
            params: {
              type: 'uid',
              value: uid
            },
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
            }
          });
        }).then(function (res) {
          const data = res.data || {};
          const userInfo = data.userInfo || data.data.userInfo || {};
          const tabsInfo = data.tabsInfo || data.data.tabsInfo || {};
          if (!userInfo) {
            return reject('User not found');
          }
          // 获取container id
          const containerId = tabsInfo.tabs[1].containerid;
          if (!containerId) {
            return reject('containerId not found');
          }
          var resultObj = {
            userInfo: userInfo,
            containerId: containerId
          };
          // 去除多余空白字符
          dataStr = JSON.stringify(resultObj);
          // 设置1天缓存
          cache.set(key, dataStr, 86400);
          resolve(resultObj);
        }).catch(function (err) {
          reject(err);
        });
      }
    }).catch(function (err) {
      reject(err);
    })
  });
}

// 自动缓存单条微博详情，减少并发请求数量
function getDetials(id, uid) {
  return new Promise(function (resolve, reject) {
    var key = `weibo-rss-details-${uid}-${id}`;
    cache.get(key).then(function (result) {
      if (result) {
        resolve(result);
      } else {
        // 缓存不存在则发出请求
        q.add(function () {
          return axios.get(DETAIL_API_URL + id, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
            }
          });
        }).then(function (res) {
          data = res.data;
          // 获取微博数据
          data = data.data;
          // 设置缓存
          cache.set(key, data);
          // 别忘了返回数据
          resolve(data);
        }).catch(function (err) {
          reject(err);
        })
      }
    }).catch(function (err) {
      reject(err);
    })
  });
}

// 格式化每条微博的HTML
function formatStatus(status) {
  // 长文章的处理
  var temp = status.longText ? status.longText.longTextContent.replace(/\n/g, '<br>') : status.text;
  // 表情图标转换为文字
  temp = temp.replace(/<span class="url-icon"><img src=".*?" style="width:1em;height:1em;" alt="(.*?)"><\/span>/g, '$1');
  // 去掉外部链接的图标
  temp = temp.replace(/<span class="url-icon"><img src=".*?"><\/span><\/i>/g, '');
  // 去掉多余无意义的标签
  temp = temp.replace(/<span class="surl-text">/g, '');
  // 最后插入两个空行，让转发的微博排版更加美观一些
  temp += "<br><br>";

  // 处理外部链接
  temp = temp.replace(/https:\/\/weibo\.cn\/sinaurl\/.*?&u=(http.*?\")/g, function (match, p1) {
    return decodeURIComponent(p1);
  });

  // 处理转发的微博
  if (status.retweeted_status) {
    // console.log(status.retweeted_status);
    // 当转发的微博被删除时user为null
    if (status.retweeted_status.user)
    temp += '转发 <a href="' + PROFILE_URL + status.retweeted_status.user.id + '" target="_blank">@' +
    status.retweeted_status.user.screen_name +
    '</a>: ';
    // 插入转发的微博
    temp += formatStatus(status.retweeted_status);
  }

  // 添加微博配图
  if (status.pics) {
    status.pics.forEach(function (item) {
      temp += '<img src="' + item.large.url + '"><br><br>';
    });
  }
  return temp;
}
