'use client';

import { useState } from 'react';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconScan,
  IconSparkles,
  IconCode,
  IconBrandPython
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

// ── 类型 ─────────────────────────────────────────────────────────
type ScanStatus = 'pending' | 'scanned' | 'enhanced' | 'error';
type Language = 'java' | 'python';

interface Project {
  id: string;
  name: string;
  language: Language;
  source_path: string;
  description: string;
  scan_status: ScanStatus;
  scanned_at: string | null;
  enhanced_at: string | null;
  schema_version: number;
  node_stats: Record<string, number>;
}

interface ProjectForm {
  id: string;
  name: string;
  language: Language | '';
  source_path: string;
  description: string;
}

// ── Mock 数据 ─────────────────────────────────────────────────────
const INIT_PROJECTS: Project[] = [
  {
    id: 'order-service',
    name: '订单服务',
    language: 'java',
    source_path: '/opt/services/order-service/target/classes',
    description: '处理订单创建、支付和配送流程',
    scan_status: 'enhanced',
    scanned_at: '2026-03-20T10:00:00Z',
    enhanced_at: '2026-03-20T10:30:00Z',
    schema_version: 3,
    node_stats: { Class: 42, Method: 218, Field: 95, Interface: 8 }
  },
  {
    id: 'user-service',
    name: '用户服务',
    language: 'java',
    source_path: '/opt/services/user-service/target/classes',
    description: '用户注册、认证和权限管理',
    scan_status: 'scanned',
    scanned_at: '2026-03-22T14:00:00Z',
    enhanced_at: null,
    schema_version: 2,
    node_stats: { Class: 28, Method: 134, Field: 61, Interface: 5 }
  },
  {
    id: 'data-pipeline',
    name: '数据管道',
    language: 'python',
    source_path: '/opt/services/data-pipeline',
    description: '数据采集、清洗和入库流水线',
    scan_status: 'error',
    scanned_at: null,
    enhanced_at: null,
    schema_version: 0,
    node_stats: {}
  },
  {
    id: 'notify-service',
    name: '通知服务',
    language: 'java',
    source_path: '/opt/services/notify-service/target/classes',
    description: '邮件、短信和推送通知',
    scan_status: 'pending',
    scanned_at: null,
    enhanced_at: null,
    schema_version: 0,
    node_stats: {}
  },
  {
    id: 'ai-router',
    name: 'AI 路由',
    language: 'python',
    source_path: '/opt/services/ai-router',
    description: '统一 AI 模型调用网关',
    scan_status: 'enhanced',
    scanned_at: '2026-03-25T09:00:00Z',
    enhanced_at: '2026-03-25T09:20:00Z',
    schema_version: 1,
    node_stats: { Module: 12, Function: 87, Class: 9 }
  }
];

const EMPTY_FORM: ProjectForm = {
  id: '',
  name: '',
  language: '',
  source_path: '',
  description: ''
};

// ── 辅助组件 ──────────────────────────────────────────────────────
function ScanStatusBadge({ status }: { status: ScanStatus }) {
  const map: Record<
    ScanStatus,
    {
      label: string;
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
    }
  > = {
    pending: { label: '待扫描', variant: 'secondary' },
    scanned: { label: '已扫描', variant: 'default' },
    enhanced: { label: '已增强', variant: 'default' },
    error: { label: '扫描失败', variant: 'destructive' }
  };
  const { label, variant } = map[status];
  return (
    <Badge
      variant={variant}
      className={status === 'enhanced' ? 'bg-green-600 hover:bg-green-700' : ''}
    >
      {label}
    </Badge>
  );
}

function LangIcon({ lang }: { lang: Language }) {
  return lang === 'python' ? (
    <IconBrandPython size={16} className='mr-1 inline text-blue-500' />
  ) : (
    <IconCode size={16} className='mr-1 inline text-orange-500' />
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── 主页面 ────────────────────────────────────────────────────────
export default function DitingProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(INIT_PROJECTS);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);

  // dialog 状态
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  // ── 新建 ──────────────────────────────────────────────────────
  function handleCreate() {
    if (!form.id || !form.language || !form.source_path) return;
    const p: Project = {
      id: form.id,
      name: form.name || form.id,
      language: form.language as Language,
      source_path: form.source_path,
      description: form.description,
      scan_status: 'pending',
      scanned_at: null,
      enhanced_at: null,
      schema_version: 0,
      node_stats: {}
    };
    setProjects((prev) => [...prev, p]);
    setForm(EMPTY_FORM);
    setCreateOpen(false);
  }

  // ── 编辑 ──────────────────────────────────────────────────────
  function openEdit(p: Project) {
    setForm({
      id: p.id,
      name: p.name,
      language: p.language,
      source_path: p.source_path,
      description: p.description
    });
    setEditTarget(p);
  }

  function handleEdit() {
    if (!editTarget || !form.source_path) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === editTarget.id
          ? {
              ...p,
              name: form.name || p.name,
              source_path: form.source_path,
              description: form.description
            }
          : p
      )
    );
    setEditTarget(null);
    setForm(EMPTY_FORM);
  }

  // ── 删除 ──────────────────────────────────────────────────────
  function handleDelete() {
    if (!deleteTarget) return;
    setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  // ── 扫描 / 增强（mock：直接更新状态）─────────────────────────
  function handleScan(id: string) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              scan_status: 'scanned',
              scanned_at: new Date().toISOString(),
              schema_version: p.schema_version + 1
            }
          : p
      )
    );
  }

  function handleEnhance(id: string) {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              scan_status: 'enhanced',
              enhanced_at: new Date().toISOString()
            }
          : p
      )
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-4 p-6'>
      {/* 顶部 */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold'>项目管理</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            管理谛听监控的代码项目
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY_FORM);
            setCreateOpen(true);
          }}
        >
          <IconPlus size={16} className='mr-1' /> 新建项目
        </Button>
      </div>

      {/* 表格 */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>项目 ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>语言</TableHead>
              <TableHead>源码路径</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>扫描时间</TableHead>
              <TableHead>节点数</TableHead>
              <TableHead className='text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => {
              const totalNodes = Object.values(p.node_stats).reduce(
                (s, n) => s + n,
                0
              );
              return (
                <TableRow key={p.id}>
                  <TableCell className='font-mono text-sm'>{p.id}</TableCell>
                  <TableCell>
                    <div className='font-medium'>{p.name}</div>
                    {p.description && (
                      <div className='text-muted-foreground max-w-48 truncate text-xs'>
                        {p.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <LangIcon lang={p.language} />
                    {p.language}
                  </TableCell>
                  <TableCell className='text-muted-foreground max-w-48 truncate font-mono text-xs'>
                    {p.source_path}
                  </TableCell>
                  <TableCell>
                    <ScanStatusBadge status={p.scan_status} />
                  </TableCell>
                  <TableCell className='text-sm'>
                    {fmtDate(p.scanned_at)}
                  </TableCell>
                  <TableCell className='text-sm'>
                    {totalNodes > 0 ? (
                      <span title={JSON.stringify(p.node_stats, null, 2)}>
                        {totalNodes}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1'>
                      <Button
                        size='sm'
                        variant='ghost'
                        title='扫描'
                        disabled={
                          p.scan_status === 'scanned' ||
                          p.scan_status === 'enhanced'
                        }
                        onClick={() => handleScan(p.id)}
                      >
                        <IconScan size={15} />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        title='增强'
                        disabled={p.scan_status !== 'scanned'}
                        onClick={() => handleEnhance(p.id)}
                      >
                        <IconSparkles size={15} />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        title='编辑'
                        onClick={() => openEdit(p)}
                      >
                        <IconEdit size={15} />
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        title='删除'
                        className='text-destructive hover:text-destructive'
                        onClick={() => setDeleteTarget(p)}
                      >
                        <IconTrash size={15} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 新建 Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>新建项目</DialogTitle>
          </DialogHeader>
          <ProjectFormFields form={form} setForm={setForm} idReadonly={false} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline'>取消</Button>
            </DialogClose>
            <Button
              onClick={handleCreate}
              disabled={!form.id || !form.language || !form.source_path}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑 Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>编辑项目</DialogTitle>
          </DialogHeader>
          <ProjectFormFields form={form} setForm={setForm} idReadonly={true} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline'>取消</Button>
            </DialogClose>
            <Button onClick={handleEdit} disabled={!form.source_path}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除项目{' '}
              <span className='font-mono font-semibold'>
                {deleteTarget?.id}
              </span>{' '}
              吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── 表单字段（新建和编辑复用）────────────────────────────────────
function ProjectFormFields({
  form,
  setForm,
  idReadonly
}: {
  form: ProjectForm;
  setForm: React.Dispatch<React.SetStateAction<ProjectForm>>;
  idReadonly: boolean;
}) {
  return (
    <div className='grid gap-4 py-2'>
      <div className='grid gap-1.5'>
        <Label htmlFor='proj-id'>
          项目 ID <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='proj-id'
          placeholder='如 order-service'
          value={form.id}
          readOnly={idReadonly}
          className={idReadonly ? 'bg-muted' : ''}
          onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
        />
        <p className='text-muted-foreground text-xs'>
          唯一标识，创建后不可修改
        </p>
      </div>
      <div className='grid gap-1.5'>
        <Label htmlFor='proj-name'>显示名称</Label>
        <Input
          id='proj-name'
          placeholder='默认同 ID'
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className='grid gap-1.5'>
        <Label htmlFor='proj-lang'>
          语言 <span className='text-destructive'>*</span>
        </Label>
        <Select
          value={form.language}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, language: v as Language }))
          }
          disabled={idReadonly}
        >
          <SelectTrigger id='proj-lang'>
            <SelectValue placeholder='选择语言' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='java'>Java</SelectItem>
            <SelectItem value='python'>Python</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className='grid gap-1.5'>
        <Label htmlFor='proj-path'>
          源码路径 <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='proj-path'
          placeholder='/opt/services/xxx/target/classes'
          value={form.source_path}
          onChange={(e) =>
            setForm((f) => ({ ...f, source_path: e.target.value }))
          }
        />
      </div>
      <div className='grid gap-1.5'>
        <Label htmlFor='proj-desc'>描述</Label>
        <Textarea
          id='proj-desc'
          placeholder='项目说明...'
          rows={3}
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
      </div>
    </div>
  );
}
