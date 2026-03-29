import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Note: Next.js 16 renamed middleware → proxy, but next-auth requires edge runtime
// which is not supported in proxy. Keeping as middleware until next-auth updates.

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/subscribers/:path*',
    '/pos/:path*',
    '/my-report/:path*',
    '/attendance/:path*',
    '/engines/:path*',
    '/fuel/:path*',
    '/my-logs/:path*',
    '/my-wallet/:path*',
    '/debts/:path*',
    '/my-expenses/:path*',
    '/settings/:path*',
  ],
}
