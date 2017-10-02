/**
 * Created by qing on 17-10-1.
 */
var axios = require('axios');
var RSS = require('rss');
var cache = require('./cache');

const API_URL = 'https://m.weibo.cn/api/container/getIndex';
const DETAIL_URL = 'https://m.weibo.cn/status/';
const PROFILE_URL = 'https://weibo.com/';

exports.fetchRSS = function(uid) {
    return new Promise(function (resolve, reject) {
        var feed; // feed 对象

        // 第一步，获取用户的信息
        axios.get(API_URL, {
            params: {
                type: 'uid',
                value: uid
            }
        }).then(function (res) {
            if (!res.data.userInfo) {
                return reject('User not found');
            }
            // 初始化 feed对象
            feed = new RSS({
                site_url: PROFILE_URL + res.data.userInfo.id,
                title: res.data.userInfo.screen_name + '的微博',
                description: res.data.userInfo.description,
                generator: 'https://github.com/zgq354/weibo-rss',
                ttl: 10
            });

            // 获取container id
            const containerId = res.data.tabsInfo.tabs[1].containerid;
            // 下一步，获取用户最近的微博
            return axios.get(API_URL, {params: { type: 'uid', value: uid, containerid: containerId }});
        }).then(function (res) {
            const cards = res.data.cards;

            // 过滤掉多余的card
            var list = cards.filter(function (item) {
                return item.card_type == 9;
            });

            // 分别抓取每一条微博的具体内容，只有访问每条微博的详情的时候才能获取到完整的全文和时间信息
            var listPromises = [];
            list.forEach(function (item) {
                listPromises.push(getDetials(item.mblog.id));
            });

            // 下一步：处理构造好的Promise的并发请求结果
            return Promise.all(listPromises);
        }).then(function (resArr) {
            resArr.forEach(function (data) {
                // 解析json
                data = JSON.parse(data);
                // 构造feed中的item
                feed.item({
                    title: data.status.status_title,
                    description: format_status(data.status),
                    url: DETAIL_URL + data.status.id,
                    guid: DETAIL_URL + data.status.id,
                    date: new Date(data.status.created_at)
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

// 自动缓存单条微博详情，减少并发请求数量
function getDetials(id) {
    return new Promise(function (resolve, reject) {
        var key = `weibo-rss-status-${id}`;
        cache.get(key).then(function (result) {
            if (result) {
                resolve(result);
            } else {
                // 缓存不存在则发出请求
                axios.get(DETAIL_URL + id).then(function (res) {
                    data = res.data;
                    // 先去掉换行，再提取json
                    data = data.replace(/\n/g, '').match(/\$render_data\s\=\s\[(.*?\})\]\[0\]/);
                    data = data ? data[1] : {};
                    // 去除多余空白字符
                    data = JSON.stringify(JSON.parse(data));
                    // 设置缓存
                    cache.set(key, data, 7200);
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
function format_status(status) {
    // 长文章的处理
    var temp = status.longText ? status.longText.longTextContent.replace(/\n/g, '<br>')
        : status.text.replace(/\<span\sclass\=\"url\-icon\"\>.*?\<\/span\>/g, '');
    temp += "<br><br>";

    // 处理转发的微博
    if (status.retweeted_status) {
        // console.log(status.retweeted_status);
        temp += '转发 <a href="' + PROFILE_URL + status.retweeted_status.user.id + '" target="_blank">@' +
            status.retweeted_status.user.screen_name +
            '</a>: ';
        // 插入转发的微博
        temp += format_status(status.retweeted_status);
    }

    // 添加微博配图
    if (status.pics) {
        status.pics.forEach(function (item) {
            temp += '<img src="' + item.url + '"><br><br>';
        });
    }
    return temp;
}
