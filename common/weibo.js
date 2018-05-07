/**
* Created by qing on 17-10-1.
*/
var axios = require('axios');
var RSS = require('rss');
var logger = require('./logger');
var cache = require('./cache');
var Queue = require('np-queue');

// 限制基本信息的并发
const infoQueue = new Queue({
  concurrency: 2
});

// 限制内容请求的并发...不能再低了/(ㄒoㄒ)/~~
const contentQueue = new Queue({
  concurrency: 1
});

const WIDGET_URL = 'http://service.weibo.com/widget/widget_blog.php';
const API_URL = 'https://m.weibo.cn/api/container/getIndex';
const DETAIL_URL = 'https://m.weibo.cn/status/';
const DETAIL_API_URL = 'https://m.weibo.cn/statuses/show?id=';
const PROFILE_URL = 'https://weibo.com/';

exports.fetchRSS = function(uid) {
  var feed; // feed 对象
  // 第一步，获取用户的信息
  return getUserInfo(uid).then(function (data) {
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
    return getIdList(uid, containerId);
  }).then(function (list) {
    // 获取微博内容
    var listPromises = [];
    list.forEach(function (id) {
      listPromises.push(getDetials(id, uid));
    });

    // 下一步：处理构造好的Promise的并发请求结果
    return Promise.all(listPromises);
  }).then(function (resArr) {
    resArr.forEach(function (data) {
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
    return Promise.resolve(feed.xml());
  });
};

// 通过用户的个性域名获取UID
exports.getUIDByDomain = function (domain) {
  // 利用手机版的跳转获取containerid
  return axios.get(PROFILE_URL + domain, {
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
    return Promise.resolve(uid);
  });
};

// 获取用户信息
// 缓存时间24小时
function getUserInfo(uid) {
  var key = `weibo-rss-info-${uid}`;
  return cache.get(key).then(function (result) {
    if (result) {
      return Promise.resolve(JSON.parse(result), true);
    } else {
      return getUserInfoByMobile(uid).then(function (resultObj) {
        if (resultObj) {
          return Promise.resolve(resultObj);
        } else {
          return getUserInfoByWidget(uid);
        }
      });
    }
  }).then(function (resultObj, isCache) {
    if (!isCache) {
      dataStr = JSON.stringify(resultObj);
      // 设置1天缓存
      cache.set(key, dataStr, 86400);
    }
    return Promise.resolve(resultObj);
  });
}

// HTML5
function getUserInfoByMobile(uid) {
  return infoQueue.add(function () {
    return axios.get(API_URL, {
      params: {
        type: 'uid',
        value: uid
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
      }
    }).then(function (res) {
      const data = res.data || {};
      if (typeof data !== 'object') return Promise.resolve(false);
      const userInfo = data.userInfo || data.data.userInfo || {};
      const tabsInfo = data.tabsInfo || data.data.tabsInfo || {};
      if (!userInfo) {
        return Promise.resolve(false);
      }
      // 获取container id
      const containerId = tabsInfo.tabs[1].containerid;
      if (!containerId) {
        return Promise.resolve(false);
      }
      var resultObj = {
        userInfo: userInfo,
        containerId: containerId
      };
      return Promise.resolve(resultObj);
    });
  });
}

// Widget
function getUserInfoByWidget(uid) {
  logger.info(`get user by widget uid: ${uid}`);
  return getListByWidget(uid).then(function (list) {
    var id = list.pop();
    return getDetials(id, uid);
  }).then(function (detail) {
    return Promise.resolve({
      userInfo: detail.user
    });
  });
}

// 获取列表
function getIdList(uid, containerId) {
  if (containerId) {
    return getListByMobile(uid, containerId);
  } else {
    return getListByWidget(uid);
  }
}

// HTML5
function getListByMobile(uid, containerId) {
  return infoQueue.add(function () {
    return axios.get(API_URL, {
      params: {
        type: 'uid',
        value: uid,
        containerid: containerId
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
      }
    }).then(function (res) {
      const data = res.data || {};
      const cards = data.cards || data.data.cards || {};

      // 过滤掉多余的card
      var list = cards.filter(function (item) {
        return item.card_type == 9;
      });
      // 结果列表
      var result = [];
      list.forEach(function (item) {
        result.push(item.mblog.id);
      });
      return Promise.resolve(result);
    });
  });
}

// Widget
function getListByWidget(uid) {
  return infoQueue.add(function () {
    return axios.get(WIDGET_URL, {
      params: {
        uid: uid
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36'
      }
    }).then(function (res) {
      const data = res.data;
      var linkArr = data.match(/<a href="http:\/\/weibo\.com\/\d+?\/(.*)?" title="" target="_blank" class="link_d">/g);
      if (!linkArr) return Promise.reject(`User not found`);
      // 结果列表
      var result = [];
      linkArr.forEach(function (v) {
        result.push(v.match(/<a href="http:\/\/weibo\.com\/\d+?\/(.*)?" title="" target="_blank" class="link_d">/)[1]);
      });
      // 截取前十条
      result = result.slice(0, 10);
      return Promise.resolve(result);
    });
  });
}

// 自动缓存单条微博详情，减少并发请求数量
function getDetials(id, uid) {
  var key = `weibo-rss-details-${uid}-${id}`;
  return cache.get(key).then(function (result) {
    if (result) {
      return Promise.resolve(result);
    } else {
      // 缓存不存在则发出请求
      return contentQueue.add(function () {
        return axios.get(DETAIL_API_URL + id, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
          }
        }).then(function (res) {
          data = res.data;
          // 获取微博数据
          data = data.data;
          // 设置缓存
          cache.set(key, data);
          // 别忘了返回数据
          return Promise.resolve(data);
        });
      });
    }
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
