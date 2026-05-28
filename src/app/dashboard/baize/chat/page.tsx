'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { Thread } from '@/components/assistant-ui/thread';
import { ChatSidebar } from './_components/chat-sidebar';
import type {
  AgentResponse,
  ChatMessageResponse
} from '@/lib/api/baize/baizeAPI.schemas';
import { listAgentsApiV1AgentsGet } from '@/lib/api/baize/agents/agents';
import {
  createSessionApiV1AgentsAgentIdSessionsPost,
  listMessagesApiV1SessionsSessionIdMessagesGet
} from '@/lib/api/baize/sessions/sessions';

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function toUIMessage(msg: ChatMessageResponse): UIMessage {
  const role = msg.role as 'user' | 'assistant';
  const parts: UIMessage['parts'] = [];

  // assistant 消息：若有 thinking 字段，先加 reasoning part
  const thinking = (msg as ChatMessageResponse & { thinking?: string | null })
    .thinking;
  if (role === 'assistant' && thinking) {
    parts.push({ type: 'reasoning', text: thinking, state: 'done' });
  }

  parts.push({ type: 'text', text: msg.content, state: 'done' });

  return { id: msg.id, role, parts };
}

/** 前端消息缓存 */
const messageCache = new Map<
  string,
  {
    messages: ChatMessageResponse[];
    oldestId: string | null;
    hasMore: boolean;
  }
>();

const PAGE_SIZE = 10;

// ── 主容器 ────────────────────────────────────────────────────────────────────

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const agentId = searchParams.get('agent') ?? '';
  const sessionId = searchParams.get('session') ?? '';

  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarRefreshRef = useRef<(() => void) | null>(null);

  // navKey：只在「显式导航」时自增（切 agent / 选会话 / 新对话），
  // 用作 ChatThread 的 key —— 会话自动创建时不变，避免 re-mount 打断流式请求
  const [navKey, setNavKey] = useState(0);

  useEffect(() => {
    listAgentsApiV1AgentsGet().then((res) => {
      if (res.status === 200) {
        setAgents(res.data);
        if (!agentId && res.data.length > 0) {
          router.replace(`?agent=${res.data[0].id}`);
        }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setAgentId = useCallback(
    (id: string) => {
      router.push(`?agent=${id}`);
      setNavKey((k) => k + 1);
    },
    [router]
  );
  const setSessionId = useCallback(
    (id: string) => {
      router.push(`?agent=${agentId}&session=${id}`);
      setNavKey((k) => k + 1);
    },
    [router, agentId]
  );
  const handleNewChat = useCallback(() => {
    router.push(`?agent=${agentId}`);
    setNavKey((k) => k + 1);
  }, [router, agentId]);

  return (
    <div className='flex flex-1 overflow-hidden'>
      <ChatSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        agents={agents}
        selectedAgentId={agentId}
        onSelectAgent={setAgentId}
        selectedSessionId={sessionId}
        onSelectSession={setSessionId}
        onNewChat={handleNewChat}
        refreshRef={sidebarRefreshRef}
      />

      <div className='flex-1 overflow-hidden'>
        {agentId ? (
          <ChatThread
            key={`${agentId}-${navKey}`}
            agentId={agentId}
            sessionId={sessionId}
            onSessionCreated={(sid) => {
              // 仅更新 URL（不自增 navKey）→ 不 re-mount，流式请求不中断
              router.replace(`?agent=${agentId}&session=${sid}`);
              sidebarRefreshRef.current?.();
            }}
          />
        ) : (
          <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
            请在左侧选择一个助手开始对话
          </div>
        )}
      </div>
    </div>
  );
}

// ── 对话区 ────────────────────────────────────────────────────────────────────

function ChatThread({
  agentId,
  sessionId,
  onSessionCreated
}: {
  agentId: string;
  sessionId: string;
  onSessionCreated?: (sessionId: string) => void;
}) {
  const [allMessages, setAllMessages] = useState<ChatMessageResponse[]>([]);
  const [loading, setLoading] = useState(!!sessionId);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [version, setVersion] = useState(0);
  // mount 时的 sessionId —— 只按它加载一次历史，会话自动创建后不重复加载
  const mountSessionId = useRef(sessionId).current;
  // 实际使用的 sessionId（新对话时在发送第一条消息后填充）
  const effectiveSessionId = useRef(sessionId);

  // 仅在 mount 时按初始 sessionId 加载历史
  useEffect(() => {
    if (!mountSessionId) {
      setAllMessages([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    const cached = messageCache.get(mountSessionId);
    if (cached) {
      setAllMessages(cached.messages);
      setHasMore(cached.hasMore);
      setLoading(false);
      return;
    }

    setLoading(true);
    listMessagesApiV1SessionsSessionIdMessagesGet(mountSessionId, {
      limit: PAGE_SIZE
    })
      .then((res) => {
        if (res.status === 200) {
          const items = res.data.items;
          const more = items.length >= PAGE_SIZE;
          messageCache.set(mountSessionId, {
            messages: items,
            oldestId: items.length > 0 ? items[0].id : null,
            hasMore: more
          });
          setAllMessages(items);
          setHasMore(more);
        }
      })
      .catch(() => setAllMessages([]))
      .finally(() => setLoading(false));
  }, [mountSessionId]);

  // 加载更多（往上翻页）
  const loadMore = useCallback(async () => {
    if (!mountSessionId || loadingMore || !hasMore) return;
    const cached = messageCache.get(mountSessionId);
    if (!cached?.oldestId) return;

    setLoadingMore(true);
    try {
      const res = await listMessagesApiV1SessionsSessionIdMessagesGet(
        mountSessionId,
        {
          limit: PAGE_SIZE,
          before: cached.oldestId
        }
      );
      if (res.status === 200) {
        const older = res.data.items;
        const merged = [...older, ...cached.messages];
        const more = older.length >= PAGE_SIZE;
        messageCache.set(mountSessionId, {
          messages: merged,
          oldestId: older.length > 0 ? older[0].id : cached.oldestId,
          hasMore: more
        });
        setAllMessages(merged);
        setHasMore(more);
        setVersion((v) => v + 1); // 强制 re-mount Thread 加载新 messages
      }
    } finally {
      setLoadingMore(false);
    }
  }, [mountSessionId, loadingMore, hasMore]);

  const uiMessages = allMessages.map(toUIMessage);

  if (loading) {
    return (
      <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
        加载对话历史…
      </div>
    );
  }

  return (
    <ChatRuntime
      key={`runtime-${version}`}
      agentId={agentId}
      sessionId={sessionId}
      initialMessages={uiMessages}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onLoadMore={loadMore}
      sessionIdRef={effectiveSessionId}
      onSessionCreated={onSessionCreated}
    />
  );
}

// ── Runtime 包装（独立组件，方便 re-mount）────────────────────────────────────

function ChatRuntime({
  agentId,
  sessionId,
  initialMessages,
  hasMore,
  loadingMore,
  onLoadMore,
  sessionIdRef,
  onSessionCreated
}: {
  agentId: string;
  sessionId: string;
  initialMessages: UIMessage[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  sessionIdRef: React.MutableRefObject<string>;
  onSessionCreated?: (sessionId: string) => void;
}) {
  const [thinkingEnabled, setThinkingEnabled] = useState(false);

  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      // 使用 prepareSendMessagesRequest 动态注入 session_id
      prepareSendMessagesRequest: async ({ messages: msgs }) => {
        // 新对话：发第一条消息时才创建 session
        if (!sessionIdRef.current) {
          const res = await createSessionApiV1AgentsAgentIdSessionsPost(
            agentId,
            {}
          );
          if (res.status === 201) {
            sessionIdRef.current = res.data.id;
            onSessionCreated?.(res.data.id);
          }
        }

        return {
          body: {
            agent_id: agentId,
            session_id: sessionIdRef.current,
            thinking: thinkingEnabled,
            messages: msgs
          }
        };
      }
    }),
    messages: initialMessages
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
        thinkingEnabled={thinkingEnabled}
        onThinkingToggle={() => setThinkingEnabled((v) => !v)}
      />
    </AssistantRuntimeProvider>
  );
}

// ── 页面入口 ──────────────────────────────────────────────────────────────────

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  );
}
