'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import {
  IconSend,
  IconRobot,
  IconUser,
  IconRefresh
} from '@tabler/icons-react';

const AGENTS = [
  { id: '1', name: '通用助手' },
  { id: '2', name: '代码助手' },
  { id: '3', name: '数据分析师' }
];

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  created_at: string;
}

const INIT_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: '你好！我是通用助手，有什么可以帮助你的吗？',
    created_at: '2026-03-25T10:00:00Z'
  },
  {
    id: '2',
    role: 'user',
    content: '帮我介绍一下这个 Portal 系统',
    created_at: '2026-03-25T10:01:00Z'
  },
  {
    id: '3',
    role: 'assistant',
    content:
      '这是一个 AI 工具集成平台（Portal），目前集成了以下子系统：\n\n• **白泽（Baize）** — AI Agent 管理、对话、会话记录和任务管理\n• **Huginn** — 自动化工作流引擎\n• **谛听（Diting）** — 系统监控\n\n您可以在左侧菜单切换不同子系统。如需进一步了解某个功能，请告诉我！',
    created_at: '2026-03-25T10:01:30Z'
  },
  {
    id: '4',
    role: 'user',
    content: '白泽支持哪些 AI 模型？',
    created_at: '2026-03-25T10:02:00Z'
  },
  {
    id: '5',
    role: 'assistant',
    content:
      '白泽目前支持以下模型提供商：\n\n1. **OpenAI** — gpt-4o, gpt-4o-mini 等\n2. **Anthropic** — claude-opus-4-6, claude-sonnet-4-6 等\n3. **Ollama** — 本地部署的开源模型（llama3.2, mistral 等）\n\n具体可用模型取决于后端配置，可在「模型配置」页面查看。',
    created_at: '2026-03-25T10:02:30Z'
  }
];

function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ChatPage() {
  const [selectedAgentId, setSelectedAgentId] = useState('1');
  const [messages, setMessages] = useState<Message[]>(INIT_MESSAGES);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
    const agent = AGENTS.find((a) => a.id === agentId);
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `你好！我是${agent?.name}，有什么可以帮助你的吗？`,
        created_at: new Date().toISOString()
      }
    ]);
  };

  const handleReset = () => {
    setMessages(INIT_MESSAGES);
    setSelectedAgentId('1');
    setInput('');
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      const replyMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '（连接 Baize 后可获得真实回复）',
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, replyMsg]);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b px-4 py-3'>
        <div className='flex items-center gap-3'>
          <span className='text-muted-foreground text-sm font-medium'>
            Agent：
          </span>
          <Select value={selectedAgentId} onValueChange={handleAgentChange}>
            <SelectTrigger className='w-40'>
              <SelectValue placeholder='选择 Agent' />
            </SelectTrigger>
            <SelectContent>
              {AGENTS.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant='ghost'
          size='icon'
          onClick={handleReset}
          title='重置对话'
        >
          <IconRefresh className='h-4 w-4' />
        </Button>
      </div>

      <Separator />

      {/* Messages */}
      <ScrollArea className='flex-1 px-4 py-4'>
        <div className='flex flex-col gap-6'>
          {messages.map((msg) => {
            const isAssistant = msg.role === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}
              >
                <Avatar className='h-8 w-8 shrink-0'>
                  <AvatarFallback
                    className={isAssistant ? 'bg-muted' : 'bg-primary'}
                  >
                    {isAssistant ? (
                      <IconRobot className='text-muted-foreground h-4 w-4' />
                    ) : (
                      <IconUser className='text-primary-foreground h-4 w-4' />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex max-w-[70%] flex-col gap-1 ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap ${
                      isAssistant
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className='text-muted-foreground px-1 text-xs'>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <Separator />

      {/* Input Bar */}
      <div className='flex items-center gap-2 px-4 py-3'>
        <Input
          className='flex-1'
          placeholder='输入消息，Enter 发送...'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button size='icon' onClick={handleSend} disabled={!input.trim()}>
          <IconSend className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}
