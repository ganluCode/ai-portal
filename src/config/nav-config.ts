import { NavItem } from '@/types';

export const navItems: NavItem[] = [
  {
    title: '概览',
    url: '/dashboard/overview',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['d', 'd'],
    items: []
  },
  {
    title: '白泽',
    url: '#',
    icon: 'agent',
    isActive: true,
    items: [
      {
        title: 'Agent 管理',
        url: '/dashboard/baize/agents',
        icon: 'agent'
      },
      {
        title: '对话',
        url: '/dashboard/baize/chat',
        icon: 'chat'
      },
      {
        title: '会话记录',
        url: '/dashboard/baize/sessions',
        icon: 'sessions'
      },
      {
        title: '任务',
        url: '/dashboard/baize/tasks',
        icon: 'tasks'
      },
      {
        title: '模型配置',
        url: '/dashboard/baize/llm',
        icon: 'llm',
        access: { role: 'admin' }
      }
    ]
  },
  {
    title: 'Huginn',
    url: '#',
    icon: 'huginn',
    isActive: false,
    items: [
      {
        title: '工作流',
        url: '/dashboard/huginn/workflows',
        icon: 'huginn'
      }
    ]
  },
  {
    title: '谛听',
    url: '#',
    icon: 'diting',
    isActive: false,
    items: [
      {
        title: '监控',
        url: '/dashboard/diting/monitor',
        icon: 'diting'
      }
    ]
  },
  {
    title: '系统管理',
    url: '#',
    icon: 'systemAdmin',
    isActive: false,
    items: [
      {
        title: '用户管理',
        url: '/dashboard/system/users',
        icon: 'teams',
        access: { role: 'admin' }
      },
      {
        title: '个人设置',
        url: '/dashboard/system/profile',
        icon: 'profile'
      }
    ]
  }
];
