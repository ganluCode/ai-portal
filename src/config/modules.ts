export interface ModuleConfig {
  name: string;
  apiUrl: string;
  apiKey: string;
  enabled: boolean;
}

// 每个后端模块的连接配置
// apiUrl / apiKey 从环境变量读取，未配置则 enabled = false
export const modules: Record<string, ModuleConfig> = {
  baize: {
    name: 'Baize',
    apiUrl: process.env.BAIZE_API_URL ?? '',
    apiKey: process.env.BAIZE_API_KEY ?? '',
    enabled: !!(process.env.BAIZE_API_URL && process.env.BAIZE_API_KEY)
  }
};
