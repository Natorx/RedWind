## 开发文档
### 项目提交规范
feat: 事迹
doc: 文档
paln: 项目规划
UI: UI优化
: 未分类
### shell
`git commit -m "msg"` 中的 -m 指的是message，也就是添加提交信息
`nest generate resource users`
`nest g resource [module]`

### React组件通信和状态管理
    想要将一个文件拆开成模块，提高代码可读性，会导致变量不在同一个文件中，无法直接使用的情况，所以需要使用到组件通信。
    在项目中，sidebar就是一个很好的示例
1. ActiveItemProvider是一个状态容器，用它包裹App让整个应用能访问同一个状态的上下文，包裹内的所有组件都可以通过useActiveItem这个hook，从而实现跨组建通信
2. useState是React内置的hook，用于组件内部的状态管理
3. useActiveItem是自定义Hook，用useContext()封装，可以访问全局共享状态。
4. createContext可以创建一个包含上下文的对象
`createContext<T>(defaultValue) `创建上下文，`<Context.Provider value={state}>` 包裹组件树提供数据，子组件用 `useContext(Context)` 获取数据。
5. hooks：以use开头的，可以让韩叔叔组建拥有状态和副作用处理能力的特殊函数
6. 副作用：副作用指的是除了渲染之外的所有操作，包括数据获取，DOM操作，订阅和事件，计时器，日志记录（渲染是主作用，其他的都是副作用）

### UnoCSS的配置
`pnpm i unocss`，接着在Vite还有main中导入一下就好了
#### 意外
我之前使用的preseUno居然被弃用了

### Prisma的配置
#### 试错
1. AI给的方案错误（和最新Prisma的配置方案对不上）
    AI说要配置env，但是最新版prisma已经不用env了，AI说要删掉prisma.config.ts，但是实际上是需要的
2. 依赖注入问题
3. 数据库驱动问题
4. 版本匹配问题
5. env环境配置问题
#### 成功方案
1. Nestjs-Prisma官方文档
`pnpm i prisma pg @prisma/client @prisma/adapter-better-sqlite3 @prisma/adapter-pg`
`npx prisma generate`：根据prisma.schema生成TS类型和PrismaClient代码
`npx prisma db push`：把文件给到数据库

### Rust调用
晚点我要看看AI生成的代码是怎么写的了

### AI调用
key:sk-2aa3f369ece6486ea717c176d291806f

### Tauri
    我意识到，Tauri的后端本质上就干三件事：
1. 运行一个独立的利用系统自带的Web视图来运行的渲染进程
2. 使用Rust来处理系统级API和业务逻辑，并通过tauri::Builder配置并且给前端通信
3. 利用Rust来以稳定且安全的方式来进行高性能处理。
main.rs中主函数中的tauri::Builder就是应用的配置和启动入口
所以本质上就是运行一个Tauri，然后写的UI被包裹在这个Tauri中，负责应用的视图，作为Tauri的一部分来运行
#### 目录结构
- capabilities：这是一份白名单，定义了这个应用允许的前端窗口和可调用的Rust命令
- gen：生成类型来给前端调用Rust命令和API（自动生成）

#### 调用
在Rust中，被`#[tauri::command]`修饰的函数都叫做命令，可以拿来给前端调用
1. 你需要用`#[tauri::command]`来修饰函数
2. 你需要在main函数中的`.invoke_handler`中注册这个命令

### Rust辅助服务
#### 陌生内容
- tokio：Rust的异步运行时
- axum：基于tokio的Web框架(Rust版Express)

### SQLite
使用Rust调用，为了防止数据监测导致的重启，所以数据暂时放到了别的地方。

### 权限
遇到了tauri新包和权限的问题，需要配置src-tauri/capabilities/default.json来让应用有足够权限，同时也下载了新的依赖，关于dialog和fs的。

## 待办计划
- [ ] 优化sidebar的配置名