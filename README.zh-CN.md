## 项目简介

[English](./README.md)

    红风工具库 —— 一个轻量的桌面多功能工具库
    Red wind —— a lightweight multi functional tool library

### 功能
以下功能全部在本地完成，不依赖服务端或外部服务。

| 模块 | 说明 |
| --- | --- |
| 📊 系统控制 | 查看硬件信息、管理进程 |
| 📺 频道 | 记录各平台关注的博主与喜欢的视频 |
| ⌨️ 打字练习 | 对着段落打字，逐字符高亮对比，划词即可查看翻译 |
| 🔧 外设调试 | 打印机（TCP 上的 ESC/POS）与串口监视（ESP32）合并在同一页 |
| 🖼️ 图片暂存 | 一键把剪贴板图片存入临时图库，再经 scp 传到远程主机 |

![系统控制](assets/doc/sys.png)
![频道](assets/doc/cannel.png)
![打字练习](assets/doc/eng_type.png)
![外设调试](assets/doc/device.png)
![图片暂存](assets/doc/pic_save.png)

已下线模块的截图保留在 `assets/history/`。

### 系统架构
- 页面：使用React+Unocss+Typescript开发页面
- 系统：调用系统API以及程序进程都由Rust负责(Tauri)
- 数据：本地数据使用SQLite进行存储，由Rust后端来控制

> 早期版本包含 AI Agent（Python）与 Fastify 服务端，这两个模块现已不属于应用的一部分，
> 因此**不需要**安装 Python，也**不需要**启动 Node 服务。
> 其源码仍保留在 `agent/` 与 `server/` 目录中，仅供参考。

## 开发
### 开始
你需要 Nodejs(24.0.0+) 和 Rust，若 Nodejs 版本低于 24.0.0，部分功能（如剪贴板图片读取）会无法使用

`pnpm install`安装所需的依赖

`pnpm dc`: 这是运行客户端主进程的命令，成功启动后，程序就可以正常跑起来了

`pnpm updater`：升级版本号，会同步修改 `package.json`、`tauri.conf.json` 与 `Cargo.toml`

`pnpm get_build`：把 `src-tauri/target/release/bundle/nsis` 中构建好的安装包提取到 `release/`

### 文件目录
```
redwind/
├── agent       已下线的 AI Agent 服务（Python），仅供参考，不属于应用的一部分
├── assets      放一些图片。assets/doc 是当前模块的截图，assets/history 保留已下线模块的截图
├── client      客户端，所有的客户端渲染相关的页面和组件都在这个文件夹中
├── commands    一些指令，用来升级版本，快速启动项目等
├── release     软件各个版本的安装包
├── server      已下线的 Fastify（Node）服务，仅供参考，不属于应用的一部分
├── src-tauri   Rust构建的后端，用来启动作为后端配合客户端页面启动进程，提供对接系统的一些功能
└── wasm        早期性能实验遗留的Rust包，当前未被使用
```