import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = (req as any).nextauth?.token;
    // Área /admin é exclusiva do papel ADMIN
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/signup')) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/campanhas/:path*',
    '/wizard/:path*',
    '/diario/:path*',
    '/keywords/:path*',
    '/configuracoes/:path*',
    '/conhecimento/:path*',
    '/rsa/:path*',
    '/agentes/:path*',
    '/planilhas/:path*',
    '/busca-produtos/:path*',
    '/pesquisa-keywords/:path*',
    '/perfil/:path*',
    '/admin/:path*',
  ],
};
