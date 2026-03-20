import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import type { BaizeTokenPayload } from './server/lib/baize-auth';

// Next.js middleware 运行在 Edge Runtime，不能用 ioredis
// 这里只做签名验证，Redis 有效性验证在 Hono 层（API 请求时）做
// 页面路由的 Redis 检查通过 /api/auth/me 在客户端做

const publicPaths = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth',
  '/api/auth/login',
  '/api/auth/register'
];

function isPublic(pathname: string) {
  return publicPaths.some((p) => pathname.startsWith(p));
}

const getSecret = () =>
  process.env.JWT_SECRET || 'mock-secret-change-in-production';

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/auth/sign-in', req.url));
  }

  try {
    // Edge 环境只验签名，Redis 失效检查在 API 层做
    jwt.verify(token, getSecret()) as BaizeTokenPayload;
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL('/auth/sign-in', req.url));
    res.cookies.delete('token');
    return res;
  }
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'
  ]
};
