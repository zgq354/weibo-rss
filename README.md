# weibo-rss

简单的微博 RSS 订阅源生成器，可将某人最近发布的微博转换为符合 RSS Feed 标准的格式供阅读器订阅。

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

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
