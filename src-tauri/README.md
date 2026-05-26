### Tauri
Tauri的后端本质上就干三件事：
1. 运行一个独立的利用系统自带的Web视图来运行的渲染进程
2. 使用Rust来处理系统级API和业务逻辑，并通过tauri::Builder配置并且给前端通信
3. 利用Rust来以稳定且安全的方式来进行高性能处理。
main.rs中主函数中的tauri::Builder就是应用的配置和启动入口
所以本质上就是运行一个Tauri，然后写的UI被包裹在这个Tauri中，负责应用的视图，作为Tauri的一部分来运行
#### 目录结构
- capabilities：这是一份白名单，定义了这个应用允许的前端窗口和可调用的Rust命令
- gen：生成类型来给前端调用Rust命令和API（自动生成）