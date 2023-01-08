# weibo-rss

简单的微博 RSS 订阅源生成器，可将某人最近发布的微博转换为符合 RSS Feed 标准的格式，供阅读器订阅。  

让你不再错过喜欢的博主的动态更新，即使身处纷繁复杂中。

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## 特点
1. 主页链接一键转换 RSS 订阅地址，简单直接
2. 严格限制程序对微博的并发请求，避免带来不必要的压力
3. 基于 `LevelDB` 在本地文件系统做 cache，内存占用极低

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

程序会启动一个 HTTP Server，默认监听：`http://0.0.0.0:3000`

## 相关项目

* [RSSHub](https://github.com/DIYgod/RSSHub)

## License

MIT
