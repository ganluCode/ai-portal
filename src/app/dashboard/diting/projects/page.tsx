'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconScan,
  IconSparkles,
  IconCode,
  IconBrandPython,
  IconLoader2
} from '@tabler/icons-react';
import { toast } from 'sonner';
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

import {
  listProjectsApiProjectsGet,
  createProjectApiProjectsPost,
  updateProjectApiProjectsProjectIdPut,
  deleteProjectApiProjectsProjectIdDelete,
  scanProjectApiProjectsProjectIdScanPost,
  enhanceProjectApiProjectsProjectIdEnhancePost
} from '@/lib/api/diting/projects/projects';
import type {
  Project,
  ProjectScanStatus
} from '@/lib/api/diting/diTingAPI.schemas';
import { ProjectCreateLanguage } from '@/lib/api/diting/diTingAPI.schemas';

// ── 类型 ─────────────────────────────────────────────────────────
type Language =
  (typeof ProjectCreateLanguage)[keyof typeof ProjectCreateLanguage];

interface ProjectForm {
  id: string;
  name: string;
  language: Language | '';
  source_path: string;
  description: string;
}

const EMPTY_FORM: ProjectForm = {
  id: '',
  name: '',
  language: '',
  source_path: '',
  description: ''
};

// ── 辅助组件 ──────────────────────────────────────────────────────
function ScanStatusBadge({
  status
}: {
  status: ProjectScanStatus | undefined;
}) {
  const map: Record<
    ProjectScanStatus,
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
  const key: ProjectScanStatus = status ?? 'pending';
  const { label, variant } = map[key];
  return (
    <Badge
      variant={variant}
      className={key === 'enhanced' ? 'bg-green-600 hover:bg-green-700' : ''}
    >
      {label}
    </Badge>
  );
}

function LangIcon({ lang }: { lang: string }) {
  return lang === 'python' ? (
    <IconBrandPython size={16} className='mr-1 inline text-blue-500' />
  ) : (
    <IconCode size={16} className='mr-1 inline text-orange-500' />
  );
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

// ── 主页面 ────────────────────────────────────────────────────────
export default function DitingProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);

  // dialog 状态
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  // ── 加载列表 ──────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listProjectsApiProjectsGet({ page: 1, size: 100 });
      if (res.status === 200) {
        setProjects(res.data.items);
      } else {
        throw new Error('加载项目列表失败');
      }
    } catch (e) {
      toast.error(`加载项目失败: ${errMsg(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ── 新建 ──────────────────────────────────────────────────────
  async function handleCreate() {
    if (!form.id || !form.language || !form.source_path) return;
    try {
      const res = await createProjectApiProjectsPost({
        id: form.id,
        name: form.name || undefined,
        language: form.language as Language,
        source_path: form.source_path,
        description: form.description || undefined
      });
      if (res.status !== 201) throw new Error('创建失败');
      toast.success(`项目 ${form.id} 已创建`);
      setForm(EMPTY_FORM);
      setCreateOpen(false);
      await loadProjects();
    } catch (e) {
      toast.error(`创建项目失败: ${errMsg(e)}`);
    }
  }

  // ── 编辑 ──────────────────────────────────────────────────────
  function openEdit(p: Project) {
    setForm({
      id: p.id,
      name: p.name,
      language: (p.language as Language) || '',
      source_path: p.source_path,
      description: p.description ?? ''
    });
    setEditTarget(p);
  }

  async function handleEdit() {
    if (!editTarget || !form.source_path) return;
    try {
      const res = await updateProjectApiProjectsProjectIdPut(editTarget.id, {
        name: form.name || null,
        source_path: form.source_path,
        description: form.description || null
      });
      if (res.status !== 200) throw new Error('更新失败');
      toast.success(`项目 ${editTarget.id} 已更新`);
      setEditTarget(null);
      setForm(EMPTY_FORM);
      await loadProjects();
    } catch (e) {
      toast.error(`更新项目失败: ${errMsg(e)}`);
    }
  }

  // ── 删除 ──────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProjectApiProjectsProjectIdDelete(deleteTarget.id);
      toast.success(`项目 ${deleteTarget.id} 已删除`);
      setDeleteTarget(null);
      await loadProjects();
    } catch (e) {
      toast.error(`删除项目失败: ${errMsg(e)}`);
    }
  }

  // ── 扫描 / 增强 ───────────────────────────────────────────────
  async function handleScan(id: string) {
    setBusyId(id);
    try {
      await scanProjectApiProjectsProjectIdScanPost(id, {});
      toast.success(`项目 ${id} 扫描已启动`);
      await loadProjects();
    } catch (e) {
      toast.error(`扫描失败: ${errMsg(e)}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleEnhance(id: string) {
    setBusyId(id);
    try {
      await enhanceProjectApiProjectsProjectIdEnhancePost(id, {});
      toast.success(`项目 ${id} 增强已启动`);
      await loadProjects();
    } catch (e) {
      toast.error(`增强失败: ${errMsg(e)}`);
    } finally {
      setBusyId(null);
    }
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
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='text-muted-foreground py-8 text-center'
                >
                  <IconLoader2 size={16} className='mr-2 inline animate-spin' />
                  加载中…
                </TableCell>
              </TableRow>
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='text-muted-foreground py-8 text-center'
                >
                  暂无项目
                </TableCell>
              </TableRow>
            ) : (
              projects.map((p) => {
                const nodeStats = p.node_stats ?? {};
                const totalNodes = Object.values(nodeStats).reduce(
                  (s, n) => s + n,
                  0
                );
                const status: ProjectScanStatus = p.scan_status ?? 'pending';
                const isBusy = busyId === p.id;
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
                      <ScanStatusBadge status={status} />
                    </TableCell>
                    <TableCell className='text-sm'>
                      {fmtDate(p.scanned_at)}
                    </TableCell>
                    <TableCell className='text-sm'>
                      {totalNodes > 0 ? (
                        <span title={JSON.stringify(nodeStats, null, 2)}>
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
                          disabled={isBusy}
                          onClick={() => handleScan(p.id)}
                        >
                          {isBusy ? (
                            <IconLoader2 size={15} className='animate-spin' />
                          ) : (
                            <IconScan size={15} />
                          )}
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          title='增强'
                          disabled={isBusy || status !== 'scanned'}
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
              })
            )}
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
