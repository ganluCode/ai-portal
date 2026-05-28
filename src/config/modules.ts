export interface ModuleConfig {
  name: string;
  apiUrl: string;
  /**
   * 模块静态 API Key（可选）
   * 设置后会以 X-API-KEY header 发送给上游（仅当 useStaticApiKey=true）
   */
  apiKey?: string;
  enabled: boolean;
  /**
   * 是否使用静态 X-API-KEY header 做模块级鉴权
   * - baize: false（baize 自己签发并验证用户 JWT，无需静态 key）
   * - 其他模块: true（通过 X-API-KEY 校验模块身份）
   *
   * 注意：无论此值如何，用户的 JWT 都会作为 Authorization: Bearer 转发到上游。
   */
  useStaticApiKey: boolean;
}

// 每个后端模块的连接配置
// apiUrl / apiKey 从环境变量读取，未配置则 enabled = false
export const modules: Record<string, ModuleConfig> = {
  baize: {
    name: 'Baize',
    apiUrl: process.env.BAIZE_API_URL ?? '',
    // baize 直接校验用户 JWT，不需要静态 API Key
    enabled: !!process.env.BAIZE_API_URL,
    useStaticApiKey: false
  },
  diting: {
    name: 'Diting',
    apiUrl: process.env.DITING_API_URL ?? '',
    apiKey: process.env.DITING_API_KEY ?? '',
    enabled: !!(process.env.DITING_API_URL && process.env.DITING_API_KEY),
    useStaticApiKey: true
  }
};
