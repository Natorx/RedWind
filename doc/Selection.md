### 技术方案选择
#### 框架
- 框架：传统框架React，灵活且生态丰富。
addition：在了解到svelte之后，有用svelte重构的想法，一款简约高性能的2016年发布且不断完善的框架。
other factors：没有选择sveltekit，因为它自带ssr，大材小用太浪费了
#### UI
- 样式：UnoCSS有比Tailwind更小的打包体积，更灵活的规则，而且支持图标，是我喜欢的原子化CSS写法
- tauri：2022年发布的新技术，极小的打包体积和Rust带来的极高性能，启动快且内存占用低
#### 业务逻辑层
- Nestjs：SpringBoot相似风格的Nodejs框架，十分好用好上手，涉及到需要服务器的情况就用它。
- Rust：使用Rust对Nest来进行性能提升。
#### 数据访问层
- 我选择使用Prisma，之前考虑过TypeORM
#### 资源管理层
- SQLite：嵌入式关系型数据库，十分轻量，本地数据就用这个了
- PGSQL：支持MySQL和MongoDB中的大部分功能，服务端拿这个存数据


### 功能技术选择
1. 语音通讯
- 方案1：可以用Nestjs来传输语音数据，也就是作为信号服务Signaling Server，帮两个客户端找到对方，交换网络地址和通讯号，然后绕过服务器通信。
Tech：Nestjs+WebSocket
- 方案2：使用WebRTC来让两个客户端通过P2P通话，低延迟且不用服务器带宽。
Tech：Rust的saorsa-webrtc等库(DHT网络发现)
方案2会更难，但正是这样才有挑战。

saorsa-webrtc使用QUIC协议通信
难点：
1. 异步Rust代码，需要理解`signaling.rs`,`media.rs`,`call.rs`
2. 库较新，只能看API文档
3. 调试比较难
