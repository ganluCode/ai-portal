import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './server/lib/jwt';

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

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for static assets and API routes (handled by Hono)
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
    verifyToken(token);
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
