# weibo-rss

简单的微博 RSS 订阅源生成器，可将某人最近发布的微博转换为符合 RSS Feed 标准的格式，供阅读器订阅。  

让你不再错过喜欢的博主的动态更新，即使身处纷繁复杂中。

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## 特点
1. 简单：主页链接一键转换 RSS 订阅源地址
2. 克制：严格限制程序对微博的并发请求，不产生额外压力
3. 省资源：基于 Node.js 实现，采用 [LevelDB](https://github.com/google/leveldb) 在本地文件系统做 cache，内存占用低（60MB 左右）

## 手动部署

依赖：`Node.js`  

安装：
```
git clone https://github.com/zgq354/weibo-rss.git
cd weibo-rss
npm i && npm run build
```

启动：
```
npm install pm2 -g
pm2 start process.json
```

程序将启动一个 HTTP Server，默认监听 `3000` 端口  
还需另外配置域名、HTTP 反向代理等

## 贡献者们
<a href="https://github.com/zgq354/weibo-rss/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=zgq354/weibo-rss" />
</a>

## 相关项目

* [RSSHub](https://github.com/DIYgod/RSSHub)

## License

MIT
