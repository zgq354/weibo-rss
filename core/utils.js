
// 
// 还原相对此刻的时间
// from: https://github.com/DIYgod/RSSHub/blob/4e5f50fe56849ff53f8f379fc46ce6febf22591f/lib/utils/date.js
// 
// 格式化 类型这个的时间 ， 几分钟前 | 几小时前 | 几天前 | 几月前 | 几年前 | 具体的格式不对的时间
const serverOffset = new Date().getTimezoneOffset() / 60;

exports.revertRelativeDate = (html, timeZone = -serverOffset) => {
  let math;
  let date = new Date();
  if (/(\d+)分钟前/.exec(html)) {
    math = /(\d+)分钟前/.exec(html);
    date.setMinutes(date.getMinutes() - math[1]);
    date.setSeconds(0);
  } else if (/(\d+)小时前/.exec(html)) {
    math = /(\d+)小时前/.exec(html);
    date.setHours(date.getHours() - math[1]);
  } else if (/(\d+)天前/.exec(html)) {
    math = /(\d+)天前/.exec(html);
    date.setDate(date.getDate() - math[1]);
  } else if (/(\d+)月前/.exec(html)) {
    math = /(\d+)月前/.exec(html);
    date.setMonth(date.getMonth() - math[1]);
  } else if (/(\d+)年前/.exec(html)) {
    math = /(\d+)年前/.exec(html);
    date.setFullYear(date.getFullYear() - math[1]);
  } else if (/今天 (\d+):(\d+)/.exec(html)) {
    math = /今天 (\d+):(\d+)/.exec(html);
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate(), math[1], math[2]);
  } else if (/昨天 (\d+):(\d+)/.exec(html)) {
    math = /昨天 (\d+):(\d+)/.exec(html);
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, math[1], math[2]);
  } else if (/前天\s*(\d+):(\d+)/.exec(html)) {
    math = /前天\s*(\d+):(\d+)/.exec(html);
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 2, math[1], math[2]);
  } else if (/(\d+)年(\d+)月(\d+)日(\d+)时/.exec(html)) {
    math = /(\d+)年(\d+)月(\d+)日(\d+)时/.exec(html);
    date = new Date(parseInt(math[1]), parseInt(math[2]) - 1, parseInt(math[3]), parseInt(math[4]));
  } else if (/(\d+)年(\d+)月(\d+)日/.exec(html)) {
    math = /(\d+)年(\d+)月(\d+)日/.exec(html);
    date = new Date(parseInt(math[1]), parseInt(math[2]) - 1, parseInt(math[3]));
  } else if (/(\d+)-(\d+)-(\d+) (\d+):(\d+)/.exec(html)) {
    math = /(\d+)-(\d+)-(\d+) (\d+):(\d+)/.exec(html);
    date = new Date(math[1], parseInt(math[2]) - 1, math[3], math[4], math[5]);
  } else if (/(\d+)-(\d+) (\d+):(\d+)/.exec(html)) {
    math = /(\d+)-(\d+) (\d+):(\d+)/.exec(html);
    date = new Date(date.getFullYear(), parseInt(math[1]) - 1, math[2], math[3], math[4]);
  } else if (/(\d+)\/(\d+)\/(\d+)\s*(\d+):(\d+)/.exec(html)) {
    math = /(\d+)\/(\d+)\/(\d+)\s*(\d+):(\d+)/.exec(html);
    date = new Date(math[1], parseInt(math[2]) - 1, math[3], math[4], math[5]);
  } else if (/(\d+)\/(\d+)\s*(\d+):(\d+)/.exec(html)) {
    math = /(\d+)\/(\d+)\s*(\d+):(\d+)/.exec(html);
    date = new Date(date.getFullYear(), parseInt(math[1]) - 1, math[2], math[3], math[4]);
  } else if (/(\d+)月(\d+)日 (\d+):(\d+)/.exec(html)) {
    math = /(\d+)月(\d+)日 (\d+):(\d+)/.exec(html);
    date = new Date(date.getFullYear(), parseInt(math[1]) - 1, math[2], math[3], math[4]);
  } else if (/(\d+)月(\d+)日/.exec(html)) {
    math = /(\d+)月(\d+)日/.exec(html);
    date = new Date(date.getFullYear(), parseInt(math[1]) - 1, math[2]);
  } else if (/(\d+)-(\d+)-(\d+)/.exec(html)) {
    math = /(\d+)-(\d+)-(\d+)/.exec(html);
    date = new Date(math[1], parseInt(math[2]) - 1, math[3]);
  } else if (/(\d+)-(\d+)/.exec(html)) {
    math = /(\d+)-(\d+)/.exec(html);
    date = new Date(date.getFullYear(), parseInt(math[1]) - 1, math[2]);
  } else if (/(\d+)\/(\d+)\/(\d+) (\d+):(\d+):(\d+)/.exec(html)) {
    math = /(\d+)\/(\d+)\/(\d+) (\d+):(\d+):(\d+)/.exec(html);
    date = new Date(math[1], parseInt(math[2]) - 1, math[3], math[4], math[5], math[6]);
  } else if (/(\d+):(\d+)/.exec(html)) {
    math = /(\d+):(\d+)/.exec(html);
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate(), math[1], math[2]);
  } else if (/刚刚/.exec(html)) {
    math = /刚刚/.exec(html);
  }

  if (math && date) {
    return new Date(date.getTime() - 60 * 60 * 1000 * (timeZone + serverOffset)).toUTCString();
  }
  return html;
};

// 生成每条微博的 HTML
exports.formatStatus = (status, largePic = true, emoji = false) => {
  const { longTextContent, url_objects: URLObjects } = status.longText || {};
  // 某些纯图片微博 status.text 的值为 null
  let tempHTML = (longTextContent ? longTextContent.replace(/\n/g, '<br>') : status.text) || "";

  if (!emoji) {
    // 表情转文字
    tempHTML = tempHTML.replace(/<span class="url-icon"><img alt="?(.*?)"? src=".*?" style="width:1em; height:1em;".*?\/><\/span>/g, '$1');
    // 去掉外链图标
    tempHTML = tempHTML.replace(/<span class='url-icon'><img.*?><\/span>/g, '');
  }

  // 外部链接
  URLObjects && URLObjects.forEach(urlObj => {
    const { url_short, url_long } = urlObj.info || {};
    if (url_short) {
      tempHTML = tempHTML.replace(new RegExp(url_short, 'g'), url_long);
    }
  });

  // 转发的微博
  if (status.retweeted_status) {
    tempHTML += "<br><br>";
    // 可能有转发的微博被删除的情况
    if (status.retweeted_status.user) {
      tempHTML += '<div style="border-left: 3px solid gray; padding-left: 1em;">' +
        '转发 <a href="https://weibo.com/' + status.retweeted_status.user.id + '" target="_blank">@' + status.retweeted_status.user.screen_name + '</a>: ' +
        exports.formatStatus(status.retweeted_status, largePic, emoji) +
        '</div>';
    }
  }

  // 微博配图
  if (status.pics) {
    status.pics.forEach(function (item) {
      tempHTML += "<br><br>";
      tempHTML += '<a href="' + item.large.url + '" target="_blank"><img src="' + (largePic ? item.large.url : item.url) + '" referrerpolicy="no-referrer"></a>';
    });
  }
  return tempHTML;
};

// sleep
exports.delayFunc = (ms) => () => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};
