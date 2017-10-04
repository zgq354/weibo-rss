# weibo-rss
把某人的微博转换成 RSS Feed，支持长微博，表情，图片，链接的完整输出

## 介绍
基于微博HTML5版的API实现  

Demo: https://api.izgq.net/weibo/rss/1461522430

## 使用
可以直接使用我搭建好的服务：
https://api.izgq.net/weibo/rss/{微博博主的uid}

uid获取：方式很多，这里介绍其中一种。  
在 [微博HTML5版](https://m.weibo.cn/) 中进入需要订阅的人的微博主页，浏览器的URL中的数字即为博主的uid  

如：
```
https://m.weibo.cn/u/1461522430
```
uid为 1461522430


## 搭建
依赖：Node.js, Redis  
参考项目中的 Dockerfile

## License
MIT
