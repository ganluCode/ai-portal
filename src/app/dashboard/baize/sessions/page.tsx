'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArchive,
  IconLoader2,
  IconMessageCircle
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { listAgentsApiV1AgentsGet } from '@/lib/api/baize/agents/agents';
import {
  listSessionsApiV1AgentsAgentIdSessionsGet,
  updateSessionApiV1SessionsSessionIdPatch
} from '@/lib/api/baize/sessions/sessions';
import type {
  AgentResponse,
  SessionResponse
} from '@/lib/api/baize/baizeAPI.schemas';

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

  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const [archiving, setArchiving] = useState<string | null>(null);

  // Load agent list on mount
  useEffect(() => {
    setAgentsLoading(true);
    listAgentsApiV1AgentsGet()
      .then((res) => {
        if (res.status === 200) {
          setAgents(res.data);
          if (res.data.length > 0) {
            setSelectedAgentId(res.data[0].id);
          }
        }
      })
      .catch(() => toast.error('加载 Agent 列表失败'))
      .finally(() => setAgentsLoading(false));
  }, []);

  // Load sessions when agent or filter changes
  const loadSessions = useCallback(
    async (agentId: string, status: FilterStatus) => {
      if (!agentId) return;
      setSessionsLoading(true);
      try {
        const res = await listSessionsApiV1AgentsAgentIdSessionsGet(
          agentId,
          status === 'all' ? {} : { status }
        );
        if (res.status === 200) {
          setSessions(res.data.items);
        }
      } catch {
        toast.error('加载会话列表失败');
      } finally {
        setSessionsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedAgentId) {
      loadSessions(selectedAgentId, filter);
    }
  }, [selectedAgentId, filter, loadSessions]);

  async function handleArchive(session: SessionResponse) {
    setArchiving(session.id);
    try {
      const res = await updateSessionApiV1SessionsSessionIdPatch(session.id, {
        status: 'archived'
      });
      if (res.status === 200) {
        toast.success('会话已归档');
        await loadSessions(selectedAgentId, filter);
      }
    } catch {
      toast.error('归档失败');
    } finally {
      setArchiving(null);
    }
  }

  const agentName = (agentId: string) =>
    agents.find((a) => a.id === agentId)?.name ?? agentId;

  return (
    <div className='flex flex-1 flex-col gap-6 p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>会话记录</h1>
        <div className='flex items-center gap-2'>
          {/* Agent selector */}
          <Select
            value={selectedAgentId}
            onValueChange={setSelectedAgentId}
            disabled={agentsLoading}
          >
            <SelectTrigger className='w-[180px]'>
              <SelectValue
                placeholder={agentsLoading ? '加载中…' : '选择 Agent'}
              />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
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
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标题</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentsLoading || sessionsLoading ? (
              <TableRow>
                <TableCell colSpan={5} className='py-10 text-center'>
                  <IconLoader2
                    size={20}
                    className='text-muted-foreground mx-auto animate-spin'
                  />
                </TableCell>
              </TableRow>
            ) : !selectedAgentId ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className='text-muted-foreground py-10 text-center text-sm'
                >
                  请先选择一个 Agent
                </TableCell>
              </TableRow>
            ) : sessions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className='text-muted-foreground py-10 text-center text-sm'
                >
                  暂无会话记录
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className='max-w-[240px] truncate font-medium'>
                    {session.title ?? '（无标题）'}
                  </TableCell>
                  <TableCell className='text-muted-foreground text-sm'>
                    {agentName(session.agent_id)}
                  </TableCell>
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
                        onClick={() =>
                          router.push(
                            `/dashboard/baize/chat?agent=${session.agent_id}&session=${session.id}`
                          )
                        }
                      >
                        <IconMessageCircle size={15} />
                        继续对话
                      </Button>
                      {session.status === 'active' && (
                        <Button
                          variant='ghost'
                          size='icon'
                          disabled={archiving === session.id}
                          onClick={() => handleArchive(session)}
                        >
                          {archiving === session.id ? (
                            <IconLoader2 size={15} className='animate-spin' />
                          ) : (
                            <IconArchive size={15} />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
