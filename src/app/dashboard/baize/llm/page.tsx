'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { listProvidersApiV1LlmProvidersGet } from '@/lib/api/baize/llm/llm';

interface LlmModel {
  id: string;
  usage?: string[];
}

interface LlmProvider {
  name: string;
  type: string;
  status: string;
  models: LlmModel[];
  description?: string;
}

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
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listProvidersApiV1LlmProvidersGet();
      if (res.status === 200) {
        setProviders(res.data as unknown as LlmProvider[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return (
    <div className='flex flex-1 flex-col gap-6 p-6'>
      <div>
        <h1 className='text-2xl font-semibold'>模型配置</h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          管理 AI 模型提供商配置（在 Baize 后端修改）
        </p>
      </div>

      {loading ? (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className='h-6 w-32' />
              </CardHeader>
              <CardContent className='flex flex-col gap-3'>
                <Skeleton className='h-4 w-full' />
                <div className='flex gap-2'>
                  <Skeleton className='h-5 w-20' />
                  <Skeleton className='h-5 w-20' />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className='text-muted-foreground py-10 text-center text-sm'>
            暂无可用的模型提供商
          </CardContent>
        </Card>
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          {providers.map((provider, i) => (
            <Card key={`${provider.type}-${i}`}>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-lg'>{provider.name}</CardTitle>
                  <StatusBadge status={provider.status} />
                </div>
              </CardHeader>
              <CardContent className='flex flex-col gap-3'>
                {provider.description && (
                  <CardDescription>{provider.description}</CardDescription>
                )}
                <div className='flex flex-wrap gap-1.5'>
                  {(provider.models ?? []).map((model) => (
                    <Badge key={model.id} variant='outline' className='text-xs'>
                      {model.id}
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
      )}

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
