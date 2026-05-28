'use client';

import { useCallback, useEffect, useState, type MutableRefObject } from 'react';
import {
  IconPlus,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLoader2,
  IconMessage,
  IconPencil,
  IconTrash,
  IconCheck,
  IconX
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { cn } from '@/lib/utils';
import {
  listSessionsApiV1AgentsAgentIdSessionsGet,
  updateSessionApiV1SessionsSessionIdPatch,
  deleteSessionApiV1SessionsSessionIdDelete
} from '@/lib/api/baize/sessions/sessions';
import type {
  AgentResponse,
  SessionResponse
} from '@/lib/api/baize/baizeAPI.schemas';

interface ChatSidebarProps {
  open: boolean;
  onToggle: () => void;
  agents: AgentResponse[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  selectedSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  /** 父组件可通过此 ref 触发 session 列表刷新 */
  refreshRef?: MutableRefObject<(() => void) | null>;
}

export function ChatSidebar({
  open,
  onToggle,
  agents,
  selectedAgentId,
  onSelectAgent,
  selectedSessionId,
  onSelectSession,
  onNewChat,
  refreshRef
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [tab, setTab] = useState<string>('agents');

  // 重命名状态
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<SessionResponse | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const loadSessions = useCallback(async (agentId: string) => {
    if (!agentId) return;
    setSessionsLoading(true);
    try {
      const res = await listSessionsApiV1AgentsAgentIdSessionsGet(agentId, {
        status: 'active'
      });
      if (res.status === 200) {
        setSessions(res.data.items);
      }
    } catch {
      toast.error('加载会话失败');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // 暴露 refresh 方法给父组件
  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = () => {
        if (selectedAgentId) loadSessions(selectedAgentId);
      };
    }
  }, [refreshRef, selectedAgentId, loadSessions]);

  useEffect(() => {
    if (selectedAgentId) {
      loadSessions(selectedAgentId);
    } else {
      setSessions([]);
    }
  }, [selectedAgentId, loadSessions]);

  function handleSelectAgent(id: string) {
    onSelectAgent(id);
    setTab('topics');
  }

  // ── 重命名 ──────────────────────────────────────────────
  function startRename(session: SessionResponse) {
    setRenamingId(session.id);
    setRenameValue(session.title ?? '');
  }

  async function confirmRename() {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error('标题不能为空');
      return;
    }
    try {
      const res = await updateSessionApiV1SessionsSessionIdPatch(renamingId, {
        title: trimmed
      });
      if (res.status === 200) {
        setSessions((prev) =>
          prev.map((s) => (s.id === renamingId ? { ...s, title: trimmed } : s))
        );
        toast.success('已重命名');
      }
    } catch {
      toast.error('重命名失败');
    } finally {
      setRenamingId(null);
    }
  }

  // ── 删除 ────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSessionApiV1SessionsSessionIdDelete(deleteTarget.id);
      setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      // 如果删的是当前选中的会话，清空
      if (deleteTarget.id === selectedSessionId) {
        onNewChat();
      }
      toast.success('会话已删除');
    } catch {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  if (!open) {
    return (
      <div className='flex flex-col items-center border-r py-2'>
        <Button variant='ghost' size='icon' onClick={onToggle} className='mb-2'>
          <IconLayoutSidebarLeftExpand size={18} />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className='flex w-[280px] shrink-0 flex-col border-r'>
        {/* Header */}
        <div className='flex items-center justify-between px-3 py-2'>
          <span className='text-sm font-semibold'>
            {selectedAgent?.name ?? '对话'}
          </span>
          <Button variant='ghost' size='icon' onClick={onToggle}>
            <IconLayoutSidebarLeftCollapse size={18} />
          </Button>
        </div>

        <Tabs
          value={tab}
          onValueChange={setTab}
          className='flex min-h-0 flex-1 flex-col'
        >
          <TabsList className='mx-3 mb-1 grid w-auto grid-cols-2'>
            <TabsTrigger value='agents'>助手</TabsTrigger>
            <TabsTrigger value='topics'>话题</TabsTrigger>
          </TabsList>

          {/* 助手 Tab */}
          <TabsContent
            value='agents'
            className='mt-0 flex min-h-0 flex-1 flex-col'
          >
            <ScrollArea className='flex-1 px-2'>
              <div className='flex flex-col gap-1 py-1'>
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent.id)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800',
                      selectedAgentId === agent.id &&
                        'bg-neutral-100 font-medium dark:bg-neutral-800'
                    )}
                  >
                    <span className='truncate'>{agent.name}</span>
                    {agent.description && (
                      <span className='text-muted-foreground truncate text-xs'>
                        {agent.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 话题 Tab */}
          <TabsContent
            value='topics'
            className='mt-0 flex min-h-0 flex-1 flex-col'
          >
            <div className='px-3 pb-2'>
              <Button
                variant='outline'
                size='sm'
                className='w-full gap-1.5'
                onClick={onNewChat}
                disabled={!selectedAgentId}
              >
                <IconPlus size={14} />
                新对话
              </Button>
            </div>

            <ScrollArea className='flex-1 px-2'>
              {sessionsLoading ? (
                <div className='flex justify-center py-8'>
                  <IconLoader2
                    size={18}
                    className='text-muted-foreground animate-spin'
                  />
                </div>
              ) : sessions.length === 0 ? (
                <p className='text-muted-foreground py-8 text-center text-xs'>
                  暂无会话
                </p>
              ) : (
                <div className='flex flex-col gap-1 py-1'>
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        'group flex items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800',
                        selectedSessionId === s.id &&
                          'bg-neutral-100 font-medium dark:bg-neutral-800'
                      )}
                    >
                      {renamingId === s.id ? (
                        /* 重命名模式 */
                        <div className='flex min-w-0 flex-1 items-center gap-1'>
                          <Input
                            className='h-7 text-xs'
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmRename();
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            autoFocus
                          />
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-6 w-6 shrink-0'
                            onClick={confirmRename}
                          >
                            <IconCheck size={13} />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-6 w-6 shrink-0'
                            onClick={() => setRenamingId(null)}
                          >
                            <IconX size={13} />
                          </Button>
                        </div>
                      ) : (
                        /* 正常模式 */
                        <>
                          <button
                            className='flex min-w-0 flex-1 items-start gap-2'
                            onClick={() => onSelectSession(s.id)}
                          >
                            <IconMessage
                              size={14}
                              className='text-muted-foreground mt-0.5 shrink-0'
                            />
                            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                              <span className='truncate'>
                                {s.title ?? '新对话'}
                              </span>
                              <span className='text-muted-foreground text-xs'>
                                {formatTime(s.updated_at)}
                              </span>
                            </div>
                          </button>
                          {/* 悬浮操作按钮 */}
                          <div className='flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100'>
                            <button
                              className='text-muted-foreground hover:text-foreground rounded p-0.5'
                              onClick={(e) => {
                                e.stopPropagation();
                                startRename(s);
                              }}
                            >
                              <IconPencil size={13} />
                            </button>
                            <button
                              className='text-muted-foreground hover:text-destructive rounded p-0.5'
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(s);
                              }}
                            >
                              <IconTrash size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* 删除确认 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除会话</AlertDialogTitle>
            <AlertDialogDescription>
              删除「{deleteTarget?.title ?? '新对话'}」后无法恢复，确认继续？
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
