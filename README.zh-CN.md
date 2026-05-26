## 项目简介

    红风工具库 —— 集成了包括Deepseek Agent在内的一些常用的功能
    Red wind —— a multi functional tool library

启动程序后，你需要自己配置所需的模块，选择“模块配置”，在可用模块库中尝试和选择你所需的模块

### 功能
![alt text](assets/pics-doc/a_modules.png)
![alt text](assets/pics-doc/a_start.png)
![alt text](assets/pics-doc/audio_control.png)
![alt text](assets/pics-doc/audio_record.png)
![alt text](assets/pics-doc/chat_ai.png)
![alt text](assets/pics-doc/chat_server.png)
![alt text](assets/pics-doc/conversion.png)
![alt text](assets/pics-doc/english.png)
![alt text](assets/pics-doc/english.png)
![alt text](assets/pics-doc/printer.png)
![alt text](assets/pics-doc/qrcode.png)
![alt text](assets/pics-doc/sys.png)

### 系统架构
- 页面：使用React+Unocss+Typescript开发页面
- Agent：接入的模型是Deepseekv4，使用Python写了一个独立的接口服务（也有单独的cli/GUI）给应用程序调用
- 服务：包括聊天室，帖子的功能都是用fastify(Nodejs)来完成的
- 系统：调用系统API以及程序进程都由Rust负责(Tauri)
- 数据：本地数据使用SQLite进行存储，由Rust后端来控制，服务端数据使用PGSQL进行存储
- 性能：使用Rust后端以及Rust的WASM来提供高性能

## For dev

### How to Start
首先，确保你的电脑中有Nodejs(24.0.0+)，和Rust，如果你电脑中的Nodejs版本低于24.0.0，部分功能会无法使用
    
`pnpm install`安装所需的依赖

`pnpm dc`: 这是运行客户端主进程的命令，成功启动后，程序就可以正常跑起来了

`pnpm ds`：标有server标签的都依赖于Node服务，它提供聊天室，帖子等功能，你需要使用`pnpm ds`启动它

`pnpm agent`：关于Agent功能，需要用到Python，如果你想要本地调试，需要保证你的电脑中有Python，使用`pnpm agent`启动Agent接口服务
