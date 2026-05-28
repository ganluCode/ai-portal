import { defineConfig } from 'orval';

export default defineConfig({
  baize: {
    input: {
      target: './openapi/baize.json'
    },
    output: {
      mode: 'tags-split', // 按 tag 分文件（auth.ts / agents.ts 等）
      target: './src/lib/api/baize',
      client: 'fetch',
      tsconfig: './tsconfig.orval.json',
      override: {
        mutator: {
          path: './src/lib/api/baize/custom-fetch.ts',
          name: 'customFetch'
        }
      }
    }
  },
  diting: {
    input: {
      target: './openapi/diting.json'
    },
    output: {
      mode: 'tags-split',
      target: './src/lib/api/diting',
      client: 'fetch',
      tsconfig: './tsconfig.orval.json',
      override: {
        mutator: {
          path: './src/lib/api/diting/custom-fetch.ts',
          name: 'customFetch'
        }
      }
    }
  }
});
