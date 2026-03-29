'use client';

import { IconInfoCircle } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter
} from '@/components/ui/card';

const MOCK_PROVIDERS = [
  {
    name: 'OpenAI',
    type: 'openai',
    status: 'available',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    description: 'OpenAI GPT 系列模型'
  },
  {
    name: 'Anthropic',
    type: 'anthropic',
    status: 'available',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
    description: 'Anthropic Claude 系列模型'
  },
  {
    name: 'Ollama',
    type: 'ollama',
    status: 'unavailable',
    models: ['llama3.2', 'mistral', 'qwen2.5'],
    description: '本地部署开源模型'
  }
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'available') {
    return (
      <Badge className='border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'>
        可用
      </Badge>
    );
  }
  return (
    <Badge variant='secondary' className='text-muted-foreground'>
      不可用
    </Badge>
  );
}

export default function Page() {
  return (
    <div className='flex flex-1 flex-col gap-6 p-6'>
      <div>
        <h1 className='text-2xl font-semibold'>模型配置</h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          管理 AI 模型提供商配置（在 Baize 后端修改）
        </p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        {MOCK_PROVIDERS.map((provider) => (
          <Card key={provider.type}>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-lg'>{provider.name}</CardTitle>
                <StatusBadge status={provider.status} />
              </div>
            </CardHeader>
            <CardContent className='flex flex-col gap-3'>
              <CardDescription>{provider.description}</CardDescription>
              <div className='flex flex-wrap gap-1.5'>
                {provider.models.map((model) => (
                  <Badge key={model} variant='outline' className='text-xs'>
                    {model}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <span className='text-muted-foreground font-mono text-xs'>
                {provider.type}
              </span>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className='border-muted bg-muted/30'>
        <CardContent className='flex items-start gap-3 pt-5'>
          <IconInfoCircle className='text-muted-foreground mt-0.5 h-4 w-4 shrink-0' />
          <p className='text-muted-foreground text-sm'>
            模型提供商配置在 Baize 后端的{' '}
            <code className='bg-muted rounded px-1 py-0.5 font-mono text-xs'>
              config.yaml
            </code>{' '}
            中管理。当前页面为只读展示，如需新增或修改提供商，请直接编辑后端配置文件并重启服务。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
