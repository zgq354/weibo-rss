# weibo-rss
把某人的微博转换成 RSS Feed，支持长微博，表情，图片，链接的输出

## 介绍
Demo: https://api.izgq.net/weibo/

## 使用
建议自行搭建，也可以直接使用我搭建好的服务：  
https://api.izgq.net/weibo/rss/{微博博主的uid}

uid获取：
可在主页中粘贴微博地址，自动转换为RSS地址  
https://api.izgq.net/weibo/

如果自己搭建，相应的链接为：  
程序主页：http://example.com/  
RSS地址：http://example.com/rss/{微博博主的uid}  

## 搭建
依赖：Node.js >= v6.9.0, Redis  
参考项目中的 Dockerfile，脚本启动时需要为程序设置 Redis 连接参数的环境变量  

## License
MIT
