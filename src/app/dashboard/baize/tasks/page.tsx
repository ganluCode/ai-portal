'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconPlus, IconTrash, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  listTasksApiV1TasksGet,
  createTaskApiV1TasksPost,
  updateTaskApiV1TasksTaskIdPatch,
  deleteTaskApiV1TasksTaskIdDelete
} from '@/lib/api/baize/tasks/tasks';
import type { TaskResponse } from '@/lib/api/baize/baizeAPI.schemas';
import { TaskStatus, TaskPriority } from '@/lib/api/baize/baizeAPI.schemas';

type Status = (typeof TaskStatus)[keyof typeof TaskStatus];
type Priority = (typeof TaskPriority)[keyof typeof TaskPriority];

const TAB_STATUS_MAP: Record<string, Status | null> = {
  all: null,
  todo: 'todo',
  in_progress: 'in_progress',
  done: 'done'
};

interface TaskForm {
  title: string;
  content: string;
  priority: Priority;
  due_date: string;
}

const EMPTY_FORM: TaskForm = {
  title: '',
  content: '',
  priority: 'medium',
  due_date: ''
};

function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === 'high') return <Badge variant='destructive'>高</Badge>;
  if (priority === 'medium') return <Badge variant='secondary'>中</Badge>;
  return <Badge variant='outline'>低</Badge>;
}

function StatusBadge({ status }: { status: Status }) {
  if (status === 'todo') return <Badge variant='secondary'>待处理</Badge>;
  if (status === 'in_progress') return <Badge variant='default'>进行中</Badge>;
  return <Badge variant='outline'>已完成</Badge>;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

function truncate(text: string | null, max = 50) {
  if (!text) return '—';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

export default function Page() {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TaskResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTasks = useCallback(async (status: Status | null) => {
    setLoading(true);
    try {
      const res = await listTasksApiV1TasksGet(status ? { status } : {});
      if (res.status === 200) {
        setTasks(res.data.items);
      }
    } catch {
      toast.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks(TAB_STATUS_MAP[tab]);
  }, [tab, loadTasks]);

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('标题不能为空');
      return;
    }
    setSaving(true);
    try {
      const res = await createTaskApiV1TasksPost({
        title: form.title.trim(),
        content: form.content.trim() || null,
        priority: form.priority,
        due_date: form.due_date || null
      });
      if (res.status === 201) {
        toast.success('任务已创建');
        setDialogOpen(false);
        setForm(EMPTY_FORM);
        await loadTasks(TAB_STATUS_MAP[tab]);
      }
    } catch {
      toast.error('创建失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(task: TaskResponse, newStatus: Status) {
    try {
      const res = await updateTaskApiV1TasksTaskIdPatch(task.id, {
        status: newStatus
      });
      if (res.status === 200) {
        toast.success('状态已更新');
        await loadTasks(TAB_STATUS_MAP[tab]);
      }
    } catch {
      toast.error('状态更新失败');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTaskApiV1TasksTaskIdDelete(deleteTarget.id);
      toast.success('任务已删除');
      setDeleteTarget(null);
      await loadTasks(TAB_STATUS_MAP[tab]);
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  }

  function renderTable(items: TaskResponse[]) {
    return (
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
              <TableHead className='w-[120px]'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className='py-10 text-center'>
                  <IconLoader2
                    size={20}
                    className='text-muted-foreground mx-auto animate-spin'
                  />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='text-muted-foreground py-10 text-center text-sm'
                >
                  暂无任务
                </TableCell>
              </TableRow>
            ) : (
              items.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className='font-medium'>{task.title}</TableCell>
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
                      {(task.tags ?? []).map((tag, i) => (
                        <Badge key={i} variant='outline' className='text-xs'>
                          {String(tag)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className='text-muted-foreground text-sm'>
                    {formatDate(task.due_date)}
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-1'>
                      {task.status !== 'done' && (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='text-xs'
                          onClick={() =>
                            handleStatusChange(
                              task,
                              task.status === 'todo' ? 'in_progress' : 'done'
                            )
                          }
                        >
                          {task.status === 'todo' ? '开始' : '完成'}
                        </Button>
                      )}
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => setDeleteTarget(task)}
                      >
                        <IconTrash size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <>
      <div className='flex flex-1 flex-col gap-4 p-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-semibold'>任务</h1>
            <p className='text-muted-foreground mt-1 text-sm'>管理异步任务</p>
          </div>
          <Button
            onClick={() => {
              setForm(EMPTY_FORM);
              setDialogOpen(true);
            }}
          >
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
              {renderTable(tasks)}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建任务</DialogTitle>
          </DialogHeader>
          <div className='flex flex-col gap-4 py-2'>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='task-title'>
                标题 <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='task-title'
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder='任务标题'
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='task-content'>内容</Label>
              <Textarea
                id='task-content'
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                placeholder='可选描述'
                rows={3}
              />
            </div>
            <div className='flex gap-4'>
              <div className='flex flex-1 flex-col gap-1.5'>
                <Label>优先级</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, priority: v as Priority }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='low'>低</SelectItem>
                    <SelectItem value='medium'>中</SelectItem>
                    <SelectItem value='high'>高</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='flex flex-1 flex-col gap-1.5'>
                <Label htmlFor='task-due'>截止日期</Label>
                <Input
                  id='task-due'
                  type='date'
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, due_date: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' disabled={saving}>
                取消
              </Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving && (
                <IconLoader2 size={14} className='mr-1.5 animate-spin' />
              )}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除任务「{deleteTarget?.title}」后无法恢复，确认继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && (
                <IconLoader2 size={14} className='mr-1.5 animate-spin' />
              )}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
