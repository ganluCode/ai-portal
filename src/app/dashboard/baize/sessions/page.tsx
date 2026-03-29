'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { IconArchive, IconMessageCircle } from '@tabler/icons-react';

const MOCK_SESSIONS = [
  {
    id: '1',
    agent_id: '1',
    agent_name: '通用助手',
    title: '关于 React 18 新特性的讨论',
    status: 'active',
    message_count: 12,
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-20T11:30:00Z'
  },
  {
    id: '2',
    agent_id: '2',
    agent_name: '代码助手',
    title: 'TypeScript 类型体操问题',
    status: 'active',
    message_count: 8,
    created_at: '2026-03-21T14:00:00Z',
    updated_at: '2026-03-21T14:45:00Z'
  },
  {
    id: '3',
    agent_id: '1',
    agent_name: '通用助手',
    title: '项目规划讨论',
    status: 'archived',
    message_count: 25,
    created_at: '2026-03-15T09:00:00Z',
    updated_at: '2026-03-16T10:00:00Z'
  },
  {
    id: '4',
    agent_id: '3',
    agent_name: '数据分析师',
    title: '销售数据分析',
    status: 'active',
    message_count: 6,
    created_at: '2026-03-22T15:00:00Z',
    updated_at: '2026-03-22T15:30:00Z'
  },
  {
    id: '5',
    agent_id: '2',
    agent_name: '代码助手',
    title: 'Python 性能优化',
    status: 'archived',
    message_count: 18,
    created_at: '2026-03-10T11:00:00Z',
    updated_at: '2026-03-11T09:00:00Z'
  },
  {
    id: '6',
    agent_id: '4',
    agent_name: '客服机器人',
    title: '产品功能咨询',
    status: 'active',
    message_count: 4,
    created_at: '2026-03-25T16:00:00Z',
    updated_at: '2026-03-25T16:20:00Z'
  }
];

type FilterStatus = 'all' | 'active' | 'archived';

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

export default function SessionsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterStatus>('all');

  const filtered = MOCK_SESSIONS.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  return (
    <div className='flex flex-1 flex-col gap-6 p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>会话记录</h1>
        <div className='flex items-center gap-1'>
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setFilter('all')}
          >
            全部
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setFilter('active')}
          >
            进行中
          </Button>
          <Button
            variant={filter === 'archived' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setFilter('archived')}
          >
            已归档
          </Button>
        </div>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标题</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>消息数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((session) => (
              <TableRow key={session.id}>
                <TableCell className='max-w-[240px] truncate font-medium'>
                  {session.title}
                </TableCell>
                <TableCell className='text-muted-foreground text-sm'>
                  {session.agent_name}
                </TableCell>
                <TableCell>{session.message_count}</TableCell>
                <TableCell>
                  {session.status === 'active' ? (
                    <Badge variant='default'>进行中</Badge>
                  ) : (
                    <Badge variant='secondary'>已归档</Badge>
                  )}
                </TableCell>
                <TableCell className='text-muted-foreground text-sm whitespace-nowrap'>
                  {formatUpdatedAt(session.updated_at)}
                </TableCell>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='gap-1.5'
                      onClick={() => router.push('/dashboard/baize/chat')}
                    >
                      <IconMessageCircle size={15} />
                      继续对话
                    </Button>
                    <Button variant='ghost' size='icon' disabled>
                      <IconArchive size={15} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
