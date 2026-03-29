'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';

const MOCK_AGENTS = [
  {
    id: '1',
    name: '通用助手',
    description: '处理日常问答和文本任务',
    model_config: { provider: 'openai', model: 'gpt-4o' },
    tools: ['search', 'calculator'],
    auto_memory_recall: true,
    shared_memory: false,
    is_default: true,
    created_at: '2026-03-01T10:00:00Z'
  },
  {
    id: '2',
    name: '代码助手',
    description: '专注于代码生成、审查和调试',
    model_config: { provider: 'anthropic', model: 'claude-sonnet-4-6' },
    tools: ['code_exec', 'search'],
    auto_memory_recall: false,
    shared_memory: false,
    is_default: false,
    created_at: '2026-03-05T14:30:00Z'
  },
  {
    id: '3',
    name: '数据分析师',
    description: '数据处理、可视化和统计分析',
    model_config: { provider: 'openai', model: 'gpt-4o-mini' },
    tools: ['python', 'search', 'calculator'],
    auto_memory_recall: true,
    shared_memory: true,
    is_default: false,
    created_at: '2026-03-10T09:15:00Z'
  },
  {
    id: '4',
    name: '客服机器人',
    description: '处理用户咨询和工单',
    model_config: { provider: 'ollama', model: 'llama3.2' },
    tools: [],
    auto_memory_recall: false,
    shared_memory: true,
    is_default: false,
    created_at: '2026-03-15T16:00:00Z'
  }
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AgentsPage() {
  return (
    <TooltipProvider>
      <div className='flex flex-1 flex-col gap-6 p-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-semibold'>Agent 管理</h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button disabled className='gap-2'>
                  <IconPlus size={16} />
                  新建 Agent
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>开发中</TooltipContent>
          </Tooltip>
        </div>

        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>模型</TableHead>
                <TableHead>工具数</TableHead>
                <TableHead>默认</TableHead>
                <TableHead>记忆</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_AGENTS.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className='font-medium'>{agent.name}</TableCell>
                  <TableCell className='text-muted-foreground max-w-[200px] truncate'>
                    {agent.description}
                  </TableCell>
                  <TableCell className='text-sm whitespace-nowrap'>
                    {agent.model_config.provider} / {agent.model_config.model}
                  </TableCell>
                  <TableCell>{agent.tools.length}</TableCell>
                  <TableCell>
                    {agent.is_default && <Badge variant='default'>默认</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className='text-muted-foreground flex flex-col gap-0.5 text-xs'>
                      {agent.auto_memory_recall && <span>自动召回</span>}
                      {agent.shared_memory && <span>共享记忆</span>}
                      {!agent.auto_memory_recall && !agent.shared_memory && (
                        <span>—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-muted-foreground text-sm whitespace-nowrap'>
                    {formatDate(agent.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <Button variant='ghost' size='icon' disabled>
                        <IconEdit size={16} />
                      </Button>
                      <Button variant='ghost' size='icon' disabled>
                        <IconTrash size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
