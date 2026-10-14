/// <reference types="vite/client" />

/** Vite 环境变量的类型声明，避免 import.meta.env.* 被推断为 any */
interface ImportMetaEnv {
  /** 本地 Node.js 服务地址 */
  readonly VITE_SERVER_URL?: string;
  /** Python Agent 服务地址 */
  readonly VITE_AGENT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
