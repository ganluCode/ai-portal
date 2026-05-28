'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconLoader2,
  IconEye,
  IconPencil
} from '@tabler/icons-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  listAgentsApiV1AgentsGet,
  createAgentApiV1AgentsPost,
  updateAgentApiV1AgentsAgentIdPut,
  deleteAgentApiV1AgentsAgentIdDelete
} from '@/lib/api/baize/agents/agents';
import { getResourceMetadataApiV1MetadataResourceGet } from '@/lib/api/baize/metadata/metadata';
import type {
  AgentResponse,
  ResourceMetadata,
  FieldDescriptor,
  FieldGroup
} from '@/lib/api/baize/baizeAPI.schemas';

// ── helpers ──────────────────────────────────────────────────────────────────

/** 把 dot-notation 的扁平对象转成嵌套对象 */
function unflatten(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [dotKey, value] of Object.entries(flat)) {
    const parts = dotKey.split('.');
    let cur = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') {
        cur[parts[i]] = {};
      }
      cur = cur[parts[i]] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = value;
  }
  return result;
}

/** 把嵌套对象扁平化成 dot-notation */
function flatten(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v as Record<string, unknown>, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

/** 从扁平 formValues 构建 AgentCreate/AgentUpdate payload（只保留 metadata 定义的字段） */
function buildPayload(
  values: Record<string, unknown>,
  groups: FieldGroup[]
): Record<string, unknown> {
  const allowedKeys = new Set(
    groups.flatMap((g) => g.fields.map((f) => f.key))
  );
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (allowedKeys.has(key)) filtered[key] = value;
  }
  return unflatten(filtered);
}

// ── 动态字段渲染 ──────────────────────────────────────────────────────────────

interface FieldProps {
  field: FieldDescriptor;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

function DynamicField({ field, value, onChange }: FieldProps) {
  const constraints = (field.constraints ?? {}) as Record<string, unknown>;
  const id = `field-${field.key}`;

  switch (field.type) {
    case 'text':
      return (
        <Input
          id={id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          maxLength={(constraints.max_length as number) ?? undefined}
        />
      );

    case 'textarea':
      return (
        <Textarea
          id={id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          rows={3}
        />
      );

    case 'int':
      return (
        <Input
          id={id}
          type='number'
          value={(value as number) ?? ''}
          min={(constraints.min as number) ?? undefined}
          max={(constraints.max as number) ?? undefined}
          onChange={(e) =>
            onChange(
              field.key,
              e.target.value === '' ? null : Number(e.target.value)
            )
          }
        />
      );

    case 'bool':
      return (
        <div className='flex items-center gap-2 pt-1'>
          <Checkbox
            id={id}
            checked={!!(value as boolean)}
            onCheckedChange={(checked) => onChange(field.key, !!checked)}
          />
          <Label htmlFor={id} className='font-normal'>
            {field.label}
          </Label>
        </div>
      );

    case 'select':
      return (
        <Select
          value={(value as string) ?? ''}
          onValueChange={(v) => onChange(field.key, v)}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder='请选择…' />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'multi_select': {
      const selected: string[] = Array.isArray(value)
        ? (value as string[])
        : [];
      return (
        <div className='flex flex-wrap gap-2 pt-1'>
          {(field.options ?? []).map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className='flex cursor-pointer items-center gap-1.5 text-sm'
              >
                <Checkbox
                  checked={checked}
                  disabled={opt.disabled}
                  onCheckedChange={(c) => {
                    const next = c
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value);
                    onChange(field.key, next);
                  }}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      );
    }

    case 'date':
      return (
        <Input
          id={id}
          type='date'
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.key, e.target.value || null)}
        />
      );

    default:
      return null;
  }
}

// ── 表格辅助 ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toolCount(agent: AgentResponse): number {
  const t = agent.tools;
  if (!t) return 0;
  return (
    (t.builtin?.length ?? 0) +
    (t.mcp_servers?.length ?? 0) +
    (t.skills?.length ?? 0)
  );
}

function modelLabel(agent: AgentResponse): string {
  const mc = agent.model_config as Record<string, string> | null | undefined;
  if (!mc) return '—';
  const chat = mc.chat;
  const reasoning = mc.reasoning;
  if (!chat && !reasoning) return '—';
  const parts: string[] = [];
  if (chat) parts.push(chat);
  if (reasoning && reasoning !== chat) parts.push(`reasoning: ${reasoning}`);
  return parts.join(' | ');
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<ResourceMetadata | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentResponse | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AgentResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 提示词弹框
  const [promptsDialog, setPromptsDialog] = useState<{
    fieldKey: string;
    label: string;
    mode: 'view' | 'edit';
    draft: string;
  } | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAgentsApiV1AgentsGet();
      if (res.status === 200) setAgents(res.data);
    } catch {
      toast.error('加载 Agent 列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
    // 并行加载 metadata
    getResourceMetadataApiV1MetadataResourceGet('agents')
      .then((res) => {
        if (res.status === 200) setMetadata(res.data);
      })
      .catch(() => {
        /* metadata 加载失败不影响主流程 */
      });
  }, [loadAgents]);

  /** 从 metadata 中收集默认值 */
  function buildDefaults(): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};
    for (const group of metadata?.groups ?? []) {
      for (const field of group.fields) {
        if (field.default != null) defaults[field.key] = field.default;
      }
    }
    return defaults;
  }

  function openCreate() {
    setEditingAgent(null);
    setFormValues(buildDefaults());
    setDialogOpen(true);
  }

  function openEdit(agent: AgentResponse) {
    setEditingAgent(agent);
    // 把 agent 的嵌套字段扁平化，再用 metadata defaults 补齐缺失
    const agentFlat = flatten(agent as unknown as Record<string, unknown>);
    setFormValues({ ...buildDefaults(), ...agentFlat });
    setDialogOpen(true);
  }

  function handleFieldChange(key: string, value: unknown) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const name = (formValues['name'] as string | undefined)?.trim();
    if (!name) {
      toast.error('名称不能为空');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(formValues, metadata?.groups ?? []);
      if (editingAgent) {
        const res = await updateAgentApiV1AgentsAgentIdPut(
          editingAgent.id,
          payload as Parameters<typeof updateAgentApiV1AgentsAgentIdPut>[1]
        );
        if (res.status === 200) {
          toast.success('Agent 已更新');
          setDialogOpen(false);
          await loadAgents();
        }
      } else {
        const res = await createAgentApiV1AgentsPost(
          payload as unknown as Parameters<typeof createAgentApiV1AgentsPost>[0]
        );
        if (res.status === 201) {
          toast.success('Agent 已创建');
          setDialogOpen(false);
          await loadAgents();
        }
      }
    } catch {
      toast.error(editingAgent ? '更新失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAgentApiV1AgentsAgentIdDelete(deleteTarget.id);
      toast.success('Agent 已删除');
      setDeleteTarget(null);
      await loadAgents();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  }

  /** 把 options_ref 动态字段的 options 填充进来 */
  function resolveField(field: FieldDescriptor): FieldDescriptor {
    if (field.options_ref === 'user_agents') {
      return {
        ...field,
        options: agents
          .filter((a) => !editingAgent || a.id !== editingAgent.id)
          .map((a) => ({ value: a.id, label: a.name, disabled: false }))
      };
    }
    return field;
  }

  /** 渲染一个 FieldGroup（bool 字段不单独加 Label） */
  function renderGroup(group: FieldGroup) {
    // 提示词组：每个字段改为"查看/编辑"按钮
    if (group.key === 'prompts') {
      return (
        <div key={group.key} className='flex flex-col gap-3 overflow-hidden'>
          <p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
            {group.label}
          </p>
          {group.fields.map((field) => {
            const val = (formValues[field.key] as string) || '';
            return (
              <div
                key={field.key}
                className='grid items-center gap-3'
                style={{ gridTemplateColumns: '1fr auto' }}
              >
                <div className='flex min-w-0 flex-col gap-0.5'>
                  <span className='text-sm font-medium'>{field.label}</span>
                  <span className='text-muted-foreground truncate text-xs'>
                    {val || '（未配置）'}
                  </span>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='gap-1.5'
                  onClick={() =>
                    setPromptsDialog({
                      fieldKey: field.key,
                      label: field.label,
                      mode: val ? 'view' : 'edit',
                      draft: val
                    })
                  }
                >
                  {val ? <IconEye size={14} /> : <IconPencil size={14} />}
                  {val ? '查看 / 编辑' : '编辑'}
                </Button>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div key={group.key} className='flex flex-col gap-3'>
        <p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
          {group.label}
        </p>
        {group.fields.map((rawField) => {
          const field = resolveField(rawField);
          return (
            <div key={field.key} className='flex flex-col gap-1.5'>
              {field.type !== 'bool' && (
                <Label htmlFor={`field-${field.key}`}>
                  {field.label}
                  {field.required && (
                    <span className='text-destructive ml-1'>*</span>
                  )}
                </Label>
              )}
              <DynamicField
                field={field}
                value={formValues[field.key] ?? null}
                onChange={handleFieldChange}
              />
              {field.description && (
                <p className='text-muted-foreground text-xs'>
                  {field.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className='flex flex-1 flex-col gap-6 p-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-semibold'>Agent 管理</h1>
          <Button onClick={openCreate} className='gap-2'>
            <IconPlus size={16} />
            新建 Agent
          </Button>
        </div>

        {loading ? (
          <div className='flex items-center justify-center py-16'>
            <IconLoader2
              size={24}
              className='text-muted-foreground animate-spin'
            />
          </div>
        ) : agents.length === 0 ? (
          <div className='text-muted-foreground rounded-md border py-16 text-center text-sm'>
            暂无 Agent，点击右上角新建
          </div>
        ) : (
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>工具数</TableHead>
                  <TableHead>记忆</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className='font-medium'>{agent.name}</TableCell>
                    <TableCell className='text-muted-foreground max-w-[200px] truncate'>
                      {agent.description ?? '—'}
                    </TableCell>
                    <TableCell className='font-mono text-xs'>
                      {agent.agent_type}
                    </TableCell>
                    <TableCell className='text-sm whitespace-nowrap'>
                      {modelLabel(agent)}
                    </TableCell>
                    <TableCell>{toolCount(agent)}</TableCell>
                    <TableCell>
                      <div className='text-muted-foreground flex flex-col gap-0.5 text-xs'>
                        {agent.memory_config?.auto_recall && (
                          <span>自动召回</span>
                        )}
                        {agent.memory_config?.shared && <span>共享记忆</span>}
                        {!agent.memory_config?.auto_recall &&
                          !agent.memory_config?.shared && <span>—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {agent.is_enabled ? (
                        <Badge className='border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'>
                          启用
                        </Badge>
                      ) : (
                        <Badge variant='secondary'>禁用</Badge>
                      )}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm whitespace-nowrap'>
                      {formatDate(agent.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => openEdit(agent)}
                        >
                          <IconEdit size={16} />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => setDeleteTarget(agent)}
                        >
                          <IconTrash size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-h-[85vh] max-w-xl overflow-x-hidden overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? '编辑 Agent' : '新建 Agent'}
            </DialogTitle>
          </DialogHeader>

          {metadata === null ? (
            /* metadata 未加载完，降级为简单表单 */
            <div className='flex flex-col gap-4 py-2'>
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='name'>
                  名称 <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='name'
                  value={(formValues['name'] as string) ?? ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='description'>描述</Label>
                <Textarea
                  id='description'
                  value={(formValues['description'] as string) ?? ''}
                  onChange={(e) =>
                    handleFieldChange('description', e.target.value)
                  }
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className='flex flex-col gap-6 py-2'>
              {metadata.groups.map(renderGroup)}
            </div>
          )}

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
              {editingAgent ? '保存' : '创建'}
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
              删除 Agent「{deleteTarget?.name}」后无法恢复，确认继续？
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

      {/* Prompts 查看/编辑弹框 */}
      <Dialog
        open={!!promptsDialog}
        onOpenChange={(o) => !o && setPromptsDialog(null)}
      >
        <DialogContent className='flex max-h-[90vh] w-[90vw] flex-col overflow-hidden sm:max-w-5xl'>
          <DialogHeader className='shrink-0'>
            <div className='flex items-center justify-between'>
              <DialogTitle>{promptsDialog?.label}</DialogTitle>
              <div className='mr-6 flex items-center gap-1 rounded-md border p-0.5'>
                <Button
                  variant={
                    promptsDialog?.mode === 'view' ? 'secondary' : 'ghost'
                  }
                  size='sm'
                  className='h-7 gap-1.5 px-2.5 text-xs'
                  onClick={() =>
                    setPromptsDialog((d) => d && { ...d, mode: 'view' })
                  }
                >
                  <IconEye size={13} />
                  预览
                </Button>
                <Button
                  variant={
                    promptsDialog?.mode === 'edit' ? 'secondary' : 'ghost'
                  }
                  size='sm'
                  className='h-7 gap-1.5 px-2.5 text-xs'
                  onClick={() =>
                    setPromptsDialog((d) => d && { ...d, mode: 'edit' })
                  }
                >
                  <IconPencil size={13} />
                  编辑
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className='min-h-0 flex-1 overflow-y-auto'>
            {promptsDialog?.mode === 'view' ? (
              promptsDialog.draft ? (
                <div className='prose prose-sm dark:prose-invert max-w-none px-1 py-2'>
                  <ReactMarkdown>{promptsDialog.draft}</ReactMarkdown>
                </div>
              ) : (
                <p className='text-muted-foreground py-8 text-center text-sm'>
                  （未配置）
                </p>
              )
            ) : (
              <Textarea
                className='min-h-[520px] resize-none font-mono text-sm'
                value={promptsDialog?.draft ?? ''}
                placeholder='支持 Markdown 格式和 Jinja2 变量，如 {{ user_name }}、{{ current_date }}'
                onChange={(e) =>
                  setPromptsDialog((d) => d && { ...d, draft: e.target.value })
                }
              />
            )}
          </div>

          <DialogFooter className='shrink-0'>
            <DialogClose asChild>
              <Button variant='outline'>取消</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (!promptsDialog) return;
                handleFieldChange(
                  promptsDialog.fieldKey,
                  promptsDialog.draft || null
                );
                setPromptsDialog(null);
                toast.success('提示词已更新，记得保存 Agent');
              }}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
