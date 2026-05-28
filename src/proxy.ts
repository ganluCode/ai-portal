import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware — 路由保护
 *
 * Edge Runtime 不与 Baize 共享 JWT 密钥，故只检查 cookie 是否存在。
 * 真正的 JWT 验证（decode + exp 检查）在 Hono authMiddleware 层完成。
 * 若 token 无效，Baize 上游会返回 401，前端再触发重新登录。
 */

const publicPaths = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth',
  '/api/auth/login',
  '/api/auth/refresh'
];

function isPublic(pathname: string) {
  return publicPaths.some((p) => pathname.startsWith(p));
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API 路由由 Hono 自行鉴权
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'
  ]
};
