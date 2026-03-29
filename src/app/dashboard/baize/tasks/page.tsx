'use client';

import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';

const MOCK_TASKS = [
  {
    id: '1',
    title: '完成 API 文档编写',
    content: '整理所有接口文档，补充示例代码',
    priority: 'high',
    status: 'in_progress',
    due_date: '2026-04-05T00:00:00Z',
    source: 'manual',
    tags: ['文档', '开发'],
    created_at: '2026-03-20T10:00:00Z'
  },
  {
    id: '2',
    title: '修复登录页样式问题',
    content: '移动端下登录按钮错位',
    priority: 'medium',
    status: 'todo',
    due_date: '2026-04-02T00:00:00Z',
    source: 'manual',
    tags: ['bug', '前端'],
    created_at: '2026-03-21T09:00:00Z'
  },
  {
    id: '3',
    title: '部署测试环境',
    content: '配置 Docker Compose 并完成测试环境部署',
    priority: 'high',
    status: 'done',
    due_date: '2026-03-28T00:00:00Z',
    source: 'agent',
    tags: ['运维', 'DevOps'],
    created_at: '2026-03-18T14:00:00Z'
  },
  {
    id: '4',
    title: '数据库性能优化',
    content: '分析慢查询，添加适当索引',
    priority: 'medium',
    status: 'todo',
    due_date: '2026-04-10T00:00:00Z',
    source: 'manual',
    tags: ['数据库', '性能'],
    created_at: '2026-03-22T11:00:00Z'
  },
  {
    id: '5',
    title: '编写单元测试',
    content: '为 auth 模块补充测试覆盖率',
    priority: 'low',
    status: 'todo',
    due_date: '2026-04-15T00:00:00Z',
    source: 'manual',
    tags: ['测试'],
    created_at: '2026-03-23T15:00:00Z'
  },
  {
    id: '6',
    title: '集成 Huginn 工作流',
    content: '接入自动化工作流引擎',
    priority: 'high',
    status: 'in_progress',
    due_date: '2026-04-08T00:00:00Z',
    source: 'agent',
    tags: ['集成', '自动化'],
    created_at: '2026-03-24T10:00:00Z'
  },
  {
    id: '7',
    title: '更新用户文档',
    content: '根据最新 UI 截图更新操作手册',
    priority: 'low',
    status: 'done',
    due_date: '2026-03-25T00:00:00Z',
    source: 'manual',
    tags: ['文档'],
    created_at: '2026-03-19T16:00:00Z'
  }
];

const TAB_STATUS_MAP: Record<string, string | null> = {
  all: null,
  todo: 'todo',
  in_progress: 'in_progress',
  done: 'done'
};

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'high') return <Badge variant='destructive'>高</Badge>;
  if (priority === 'medium') return <Badge variant='secondary'>中</Badge>;
  return <Badge variant='outline'>低</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'todo') return <Badge variant='secondary'>待处理</Badge>;
  if (status === 'in_progress') return <Badge variant='default'>进行中</Badge>;
  return <Badge variant='outline'>已完成</Badge>;
}

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

function truncate(text: string, max = 50) {
  return text.length > max ? text.slice(0, max) + '...' : text;
}

export default function Page() {
  const [tab, setTab] = useState('all');

  const statusFilter = TAB_STATUS_MAP[tab];
  const filteredTasks =
    statusFilter === null
      ? MOCK_TASKS
      : MOCK_TASKS.filter((t) => t.status === statusFilter);

  return (
    <div className='flex flex-1 flex-col gap-4 p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold'>任务</h1>
          <p className='text-muted-foreground mt-1 text-sm'>管理异步任务</p>
        </div>
        <Button disabled>
          <IconPlus className='mr-2 h-4 w-4' />
          新建任务
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value='all'>全部</TabsTrigger>
          <TabsTrigger value='todo'>待处理</TabsTrigger>
          <TabsTrigger value='in_progress'>进行中</TabsTrigger>
          <TabsTrigger value='done'>已完成</TabsTrigger>
        </TabsList>

        {(['all', 'todo', 'in_progress', 'done'] as const).map((key) => (
          <TabsContent key={key} value={key}>
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[160px]'>标题</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead className='w-[80px]'>优先级</TableHead>
                    <TableHead className='w-[90px]'>状态</TableHead>
                    <TableHead className='w-[100px]'>来源</TableHead>
                    <TableHead>标签</TableHead>
                    <TableHead className='w-[110px]'>截止日期</TableHead>
                    <TableHead className='w-[80px]'>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className='text-muted-foreground py-10 text-center text-sm'
                      >
                        暂无任务
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className='font-medium'>
                          {task.title}
                        </TableCell>
                        <TableCell className='text-muted-foreground text-sm'>
                          {truncate(task.content)}
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={task.priority} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={task.status} />
                        </TableCell>
                        <TableCell className='text-muted-foreground text-sm'>
                          {task.source === 'agent' ? 'Agent 创建' : '手动'}
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-wrap gap-1'>
                            {task.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant='outline'
                                className='text-xs'
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className='text-muted-foreground text-sm'>
                          {formatDate(task.due_date)}
                        </TableCell>
                        <TableCell>
                          <Button variant='ghost' size='sm' disabled>
                            详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
