/**
* Created by qing on 17-10-1.
*/
var axios = require('axios');
var RSS = require('rss');
var logger = require('./logger');
var cache = require('./cache');
var Queue = require('np-queue');

// 请求超时的情况
var axiosInstance = axios.create({
  timeout: 3000,
});

// 缓存过期时间
const contentExpire = 7 * 24 * 3600;

// 限制基本信息的并发
const infoQueue = new Queue({
  concurrency: 2
});

// 限制内容请求的并发...不能再低了/(ㄒoㄒ)/~~
const contentQueue = new Queue({
  concurrency: 1
});

exports.fetchRSS = function (uid, options) {
  if (!options) options = {};
  // 大图显示
  if (options.largePic === undefined) {
    options.largePic = true;
  }
  // TTL
  if (options.ttl === undefined) {
    options.ttl = 15;
  }
  // 表情图标
  if (options.emoji === undefined) {
    options.emoji = false;
  }
  // 获取微博
  return getWeibo(uid)
    .then(function (weiboData) {
      // metadata
      var feed = new RSS({
        site_url: "https://weibo.com/" + weiboData.user.id,
        title: weiboData.user.screen_name + '的微博',
        description: weiboData.user.description,
        generator: 'https://github.com/zgq354/weibo-rss',
        ttl: options.ttl
      });
      // content
      weiboData.statuses.forEach(function (detail) {
        if (!detail) return;
        feed.item({
          title: detail.status_title || (detail.text ? detail.text.replace(/<[^>]+>/g, '').replace(/[\n]/g, '').substr(0, 25) : null),
          description: formatStatus(detail, options.largePic, options.emoji),
          url: 'https://weibo.com/' + weiboData.user.id + '/' + detail.bid,
          guid: 'https://weibo.com/' + weiboData.user.id + '/' + detail.bid,
          date: new Date(detail.created_at)
        });
      });
      return feed.xml();
    });
}

// 通过用户的个性域名获取UID
exports.getUIDByDomain = function (domain) {
  // 利用手机版的跳转获取
  return axiosInstance.get('https://weibo.com/' + domain, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
    }
  }).then(function (data) {
    const uid = data.request.path.split("/u/")[1];
    return uid;
  });
};

// 获取目标最近的微博
function getWeibo(uid) {
  return getWeiboByPWA(uid)
    .then(function (data) {
      // 备选方案
      if (!data) return getWeiboByWidget(uid);
      return data;
    })
    .then(function (data) {
      if (!data) return Promise.reject('user_not_found');
      return processDetails(data);
    });
}

// 补充全文和细节
function processDetails(data) {
  var listPromises = [];
  data.statuses.forEach(function (status, i) {
    if (!status.need_detail && !status.isLongText && (!status.retweeted_status || !status.retweeted_status.isLongText)) {
      listPromises.push(status);
    } else {
      listPromises.push(getDetail(status.id)
        .then(function (detail) {
          // 全文获取失败，恢复原状
          if (!detail) {
            return status;
          }
          return detail;
        }));
    }
  });
  return Promise.all(listPromises)
    .then(function (listArr) {
      data.statuses = listArr;
      return data;
    });
}

// PWA
function getWeiboByPWA(uid) {
  return infoQueue.add(function () {
    return axiosInstance.get(`https://m.weibo.cn/profile/info?uid=${uid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
      }
    }).then(function (res) {
      const data = res.data || {};
      if (typeof data !== 'object') return false;
      // 用户不存在
      if (data.ok !== 1) return false;
      return data.data;
    });
  });
}

// 通过 Widget 获得目标最近微博列表
function getWeiboByWidget(uid) {
  logger.info(`get ${uid} by widget`);
  var data = {};
  return getListByWidget(uid)
    .then(function (statuses) {
      data.statuses = statuses;
      return getDetail(statuses[0].id, uid);
    })
    .then(function (detail) {
      data.user = detail.user;
      return data;
    })
    .catch(function (err) {
      if (err === "user_not_found") {
        return false;
      }
      return Promise.reject(err);
    });
}

// 通过 Widget 获取最近微博的 List
function getListByWidget(uid) {
  return infoQueue.add(function () {
    return axiosInstance.get(`http://service.weibo.com/widget/widget_blog.php?uid=${uid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36'
      }
    })
      .then(function (res) {
        const data = res.data;
        var linkArr = data.match(/<a href="http:\/\/weibo\.com\/\d+?\/(.*)?" title="" target="_blank" class="link_d">/g);
        if (!linkArr) return Promise.reject("user_not_found");
        var result = [];
        linkArr.forEach(function (v) {
          result.push({
            id: v.match(/<a href="http:\/\/weibo\.com\/\d+?\/(.*)?" title="" target="_blank" class="link_d">/)[1],
            need_detail: true,
          });
        });
        result = result.slice(0, 10);
        return result;
      });
  });
}

// 获取单条微博的详情
function getDetail(id) {
  var key = `details-${id}`;
  return cache.get(key).then(function (result) {
    if (result) {
      return result;
    } else {
      return contentQueue.add(function () {
        return axiosInstance.get('https://m.weibo.cn/statuses/show?id=' + id, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
          }
        })
        .then(function (res) {
          data = res.data;
          data = data.data;
          cache.set(key, data, contentExpire);
          return data;
        });
      });
    }
  });
}

// 生成每条微博的HTML
function formatStatus(status, largePic = true, emoji = false) {
  // 长文章处理
  var temp = status.longText ? status.longText.longTextContent.replace(/\n/g, '<br>') : status.text;
  // 某些纯图片微博 status.text 的值为 null
  if (!temp) temp = "";

  if (!emoji) {
    // 表情图标转换为文字
    temp = temp.replace(/<span class="url-icon"><img alt="(.*?)" src=".*?" style="width:1em; height:1em;"\/><\/span>/g, '$1');
    // 去掉外部链接的图标
    temp = temp.replace(/<span class='url-icon'><img.*?><\/span>/g, '');
  }

  // 处理外部链接
  temp = temp.replace(/https:\/\/weibo\.cn\/sinaurl\/.*?&u=(http.*?\")/g, function (match, p1) {
    return decodeURIComponent(p1);
  });

  // 处理转发的微博
  if (status.retweeted_status) {
    temp += "<br><br>";
    // 可能有转发的微博被删除的情况
    if (status.retweeted_status.user) {
      temp += '<div style="border-left: 3px solid gray; padding-left: 1em;">'
            + '转发 <a href="https://weibo.com/' + status.retweeted_status.user.id + '" target="_blank">@' + status.retweeted_status.user.screen_name + '</a>: '
            + formatStatus(status.retweeted_status, largePic, emoji)
            + '</div>';
    }
  }
  // 添加微博配图
  if (status.pics) {
    status.pics.forEach(function (item) {
      temp += "<br><br>";
      temp += '<a href="' + item.large.url + '" target="_blank"><img src="' + (largePic ? item.large.url : item.url) + '"></a>';
    });
  }
  return temp;
}
