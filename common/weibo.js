/**
* Created by qing on 17-10-1.
*/
var axios = require('axios');
var RSS = require('rss');
var logger = require('./logger');
var cache = require('./cache');
var Queue = require('np-queue');

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
        // 构造feed中的item
        feed.item({
          title: detail.status_title || (detail.text ? detail.text.replace(/<[^>]+>/g, '').replace(/[\n【】\[\]]/g, '').substr(0, 25) : null),
          description: formatStatus(detail, options.largePic),
          url: 'https://m.weibo.cn/status/' + detail.id,
          guid: 'https://m.weibo.cn/status/' + detail.id,
          date: new Date(detail.created_at)
        });
      });
      // 成功的情况
      return Promise.resolve(feed.xml());
    });
}

// 通过用户的个性域名获取UID
exports.getUIDByDomain = function (domain) {
  if (domain.match(/^\d{1,9}$/g)) {
    // 较短的纯数字UID通过WAP版得到完整UID
    return axios.get('https://weibo.cn/' + domain)
      .then(function (res) {
        const data = res.data;
        const uid = data.match(/<a href="\/(\d{10})\/follow">/)[1];
        return Promise.resolve(uid);
      });
  } else {
    // 个性域名则利用手机版的跳转获取
    return axios.get('https://weibo.com/' + domain, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
      }
    }).then(function (data) {
      const uid = data.request.path.split("/u/")[1];
      return Promise.resolve(uid);
    });
  }
};

// 获取目标最近的微博
function getWeibo(uid) {
  return getWeiboByPWA(uid)
    .then(function (data) {
      // 备选方案
      if (!data) return getWeiboByWidget(uid);
      return Promise.resolve(data);
    })
    .then(function (data) {
      if (!data) return Promise.reject('user_not_found');
      return processDetails(data);
    });
}

// 补充全文和细节
function processDetails(data) {
  var listPromises = [];
  data.statuses.forEach(function (status) {
    // 判断是否需要请求全文
    if (!status.need_detail && !status.isLongText && (!status.retweeted_status || !status.retweeted_status.isLongText)) {
      listPromises.push(Promise.resolve(status));
    } else {
      listPromises.push(getDetail(status.id));
    }
  });
  return Promise.all(listPromises)
    .then(function (listArr) {
      data.statuses = listArr;
      return Promise.resolve(data);
    });
}

// PWA
function getWeiboByPWA(uid) {
  return infoQueue.add(function () {
    return axios.get(`https://m.weibo.cn/profile/info?uid=${uid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
      }
    }).then(function (res) {
      const data = res.data || {};
      if (typeof data !== 'object') return Promise.resolve(false);
      // 用户不存在
      if (data.ok !== 1) return Promise.resolve(false);

      return Promise.resolve(data.data);
    });
  });
}

// 通过 Widget 获得目标最近微博列表
function getWeiboByWidget(uid) {
  logger.info(`get by widget uid: ${uid}`);
  var data = {};
  return getListByWidget(uid)
    .then(function (statuses) {
      data.statuses = statuses;
      return getDetail(statuses[0].id, uid);
    })
    .then(function (detail) {
      // 额外获取用户信息
      data.user = detail.user;
      return Promise.resolve(data);
    })
    .catch(function (err) {
      // 用户不存在
      if (err === "user_not_found") {
        return Promise.resolve(false);
      }
      // 其它错误，抛给上层
      return Promise.reject(err);
    });
}

// 通过 Widget 获取最近微博的 List
function getListByWidget(uid) {
  return infoQueue.add(function () {
    return axios.get(`http://service.weibo.com/widget/widget_blog.php?uid=${uid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36'
      }
    })
      .then(function (res) {
        const data = res.data;
        var linkArr = data.match(/<a href="http:\/\/weibo\.com\/\d+?\/(.*)?" title="" target="_blank" class="link_d">/g);
        if (!linkArr) return Promise.reject("user_not_found");
        // 结果列表
        var result = [];
        linkArr.forEach(function (v) {
          result.push({
            id: v.match(/<a href="http:\/\/weibo\.com\/\d+?\/(.*)?" title="" target="_blank" class="link_d">/)[1],
            need_detail: true,
          });
        });
        // 截取前十条
        result = result.slice(0, 10);
        return Promise.resolve(result);
      });
  });
}

// 获取单条微博的详情
function getDetail(id) {
  var key = `details-${id}`;
  return cache.get(key).then(function (result) {
    if (result) {
      return Promise.resolve(result);
    } else {
      // 缓存不存在则发出请求
      return contentQueue.add(function () {
        return axios.get('https://m.weibo.cn/statuses/show?id=' + id, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1'
          }
        })
        .then(function (res) {
          data = res.data;
          // 获取微博数据
          data = data.data;
          // 设置缓存
          cache.set(key, data, contentExpire);
          // 别忘了返回数据
          return Promise.resolve(data);
        });
      });
    }
  });
}

// 格式化每条微博的HTML
function formatStatus(status, largePic = true) {
  // 长文章的处理
  var temp = status.longText ? status.longText.longTextContent.replace(/\n/g, '<br>') : status.text;
  // 某些纯图片微博 status.text 的值为 null
  if (!temp) temp = "";
  // 表情图标转换为文字
  temp = temp.replace(/<span class="url-icon"><img alt="(.*?)" src=".*?" style="width:1em; height:1em;"\/><\/span>/g, '$1');
  // 去掉外部链接的图标
  temp = temp.replace(/<span class='url-icon'><img.*?><\/span>/g, '');

  // 处理外部链接
  temp = temp.replace(/https:\/\/weibo\.cn\/sinaurl\/.*?&u=(http.*?\")/g, function (match, p1) {
    return decodeURIComponent(p1);
  });

  // 处理转发的微博
  if (status.retweeted_status) {
    // 先加入两个空行
    temp += "<br><br>";
    // 当转发的微博被删除时user为null
    if (status.retweeted_status.user)
    temp += '<div style="border-left: 3px solid gray; padding-left: 1em;">'
          + '转发 <a href="' + 'https://weibo.com/' + status.retweeted_status.user.id + '" target="_blank">@' + status.retweeted_status.user.screen_name + '</a>: ';
    // 插入转发的微博
    temp += formatStatus(status.retweeted_status, largePic);
    temp += '</div>';
  }

  // 添加微博配图
  if (status.pics) {
    status.pics.forEach(function (item) {
      // 先加入两个空行
      temp += "<br><br>";
      // 点击链接打开图片
      temp += '<a href="' + item.large.url + '" target="_blank"><img src="' + (largePic ? item.large.url : item.url) + '"></a>';
    });
  }
  return temp;
}
