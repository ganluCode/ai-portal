'use client';

import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive
} from '@assistant-ui/react';
import {
  IconArrowUp,
  IconArrowDown,
  IconCopy,
  IconLoader2,
  IconRefresh,
  IconDownload,
  IconSquareFilled,
  IconBrain,
  IconChevronDown,
  IconChevronRight
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ── Thread ───────────────────────────────────────────────────────────────────

interface ThreadProps {
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  thinkingEnabled?: boolean;
  onThinkingToggle?: () => void;
}

export function Thread({
  hasMore,
  loadingMore,
  onLoadMore,
  thinkingEnabled,
  onThinkingToggle
}: ThreadProps) {
  return (
    <ThreadPrimitive.Root className='flex h-full flex-col'>
      <ThreadPrimitive.Viewport
        autoScroll
        scrollToBottomOnInitialize
        className='flex flex-1 flex-col items-center overflow-y-auto'
      >
        <div className='w-full max-w-3xl flex-1 space-y-4 px-4 py-6'>
          {hasMore && (
            <LoadMoreSentinel loading={!!loadingMore} onLoadMore={onLoadMore} />
          )}

          <ThreadPrimitive.Empty>
            <div className='text-muted-foreground flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-center'>
              <p className='text-lg font-medium'>开始新对话</p>
              <p className='text-sm'>输入消息，AI 助手会为你解答</p>
            </div>
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage
            }}
          />
        </div>

        <ThreadPrimitive.ViewportFooter className='sticky bottom-0 w-full max-w-3xl px-4 pb-4'>
          <ThreadScrollToBottom />
          <Composer
            thinkingEnabled={thinkingEnabled}
            onThinkingToggle={onThinkingToggle}
          />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

// ── 滚到顶自动加载 ────────────────────────────────────────────────────────────

function LoadMoreSentinel({
  loading,
  onLoadMore
}: {
  loading: boolean;
  onLoadMore?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onLoadMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, loading]);

  return (
    <div ref={ref} className='flex justify-center py-2'>
      {loading && (
        <IconLoader2 size={16} className='text-muted-foreground animate-spin' />
      )}
    </div>
  );
}

// ── Composer（输入框）─────────────────────────────────────────────────────────

function Composer({
  thinkingEnabled,
  onThinkingToggle
}: {
  thinkingEnabled?: boolean;
  onThinkingToggle?: () => void;
}) {
  return (
    <ComposerPrimitive.Root className='border-input bg-background flex flex-col gap-2 rounded-xl border px-4 py-3 shadow-sm'>
      <ComposerPrimitive.Input
        autoFocus
        placeholder='输入消息…'
        rows={1}
        className='placeholder:text-muted-foreground max-h-40 flex-1 resize-none border-0 bg-transparent text-sm outline-none'
      />

      <div className='flex items-center justify-between'>
        {/* 思考开关 */}
        <button
          type='button'
          onClick={onThinkingToggle}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors',
            thinkingEnabled
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <IconBrain size={14} />
          深度思考
        </button>

        {/* 发送/停止按钮 */}
        <div>
          <ThreadPrimitive.If running={false}>
            <ComposerPrimitive.Send asChild>
              <Button size='icon' className='h-8 w-8 shrink-0 rounded-lg'>
                <IconArrowUp size={16} />
              </Button>
            </ComposerPrimitive.Send>
          </ThreadPrimitive.If>

          <ThreadPrimitive.If running>
            <ComposerPrimitive.Cancel asChild>
              <Button
                size='icon'
                variant='destructive'
                className='h-8 w-8 shrink-0 rounded-lg'
              >
                <IconSquareFilled size={14} />
              </Button>
            </ComposerPrimitive.Cancel>
          </ThreadPrimitive.If>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

// ── 用户消息 ──────────────────────────────────────────────────────────────────

function UserMessage() {
  return (
    <MessagePrimitive.Root className='flex justify-end'>
      <div className='bg-primary text-primary-foreground max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm'>
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

// ── AI 消息 ───────────────────────────────────────────────────────────────────

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className='flex justify-start'>
      <div className='group max-w-[85%] min-w-0'>
        <MessagePrimitive.Content
          components={{
            Text: MarkdownText,
            Reasoning: ReasoningBlock
          }}
        />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
}

// ── 思考折叠区 ────────────────────────────────────────────────────────────────

function ReasoningBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(true);
  if (!text) return null;
  return (
    <div className='mb-2 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/50'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        className='text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 px-3 py-2 text-xs'
      >
        {open ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
        <IconBrain size={12} />
        <span>深度思考</span>
      </button>
      {open && (
        <div className='text-muted-foreground border-t border-neutral-200 px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap dark:border-neutral-700'>
          {text}
        </div>
      )}
    </div>
  );
}

// ── 文字气泡 ──────────────────────────────────────────────────────────────────

function MarkdownText({ text }: { text: string }) {
  return (
    <div className='overflow-hidden rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3 dark:bg-neutral-800'>
      <div className='prose prose-sm dark:prose-invert prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:my-2 prose-pre:overflow-x-auto prose-code:break-all max-w-none'>
        <ReactMarkdown
          components={{
            pre: ({ children }) => (
              <pre className='overflow-x-auto rounded-lg bg-neutral-900 p-3 text-sm text-neutral-100 dark:bg-neutral-950'>
                {children}
              </pre>
            ),
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code
                    className='rounded bg-neutral-200 px-1.5 py-0.5 text-xs dark:bg-neutral-700'
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <code className={cn('text-sm', className)} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// ── 操作栏 ────────────────────────────────────────────────────────────────────

function AssistantActionBar() {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide='not-last'
      className='text-muted-foreground mt-1 flex items-center gap-1'
    >
      <ActionBarPrimitive.Copy asChild>
        <ActionButton tooltip='复制'>
          <IconCopy size={14} />
        </ActionButton>
      </ActionBarPrimitive.Copy>

      <ActionBarPrimitive.Reload asChild>
        <ActionButton tooltip='重新生成'>
          <IconRefresh size={14} />
        </ActionButton>
      </ActionBarPrimitive.Reload>

      <ActionBarPrimitive.ExportMarkdown asChild>
        <ActionButton tooltip='导出 Markdown'>
          <IconDownload size={14} />
        </ActionButton>
      </ActionBarPrimitive.ExportMarkdown>
    </ActionBarPrimitive.Root>
  );
}

function ActionButton({
  tooltip,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tooltip: string }) {
  return (
    <button
      title={tooltip}
      className='hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors'
      {...props}
    >
      {children}
    </button>
  );
}

// ── 滚动到底部 ────────────────────────────────────────────────────────────────

function ThreadScrollToBottom() {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <Button
        variant='outline'
        size='icon'
        className='mx-auto mb-2 h-8 w-8 rounded-full shadow-md'
      >
        <IconArrowDown size={14} />
      </Button>
    </ThreadPrimitive.ScrollToBottom>
  );
}
