import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasEditorRole, supabaseConfig } from '@/lib/supabase';

export async function proxy(request: NextRequest) {
  if (!supabaseConfig) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(cacheHeaders).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const hasAuthenticatedClaims = Boolean(data?.claims?.sub);
  if (
    request.nextUrl.pathname.startsWith('/admin') &&
    hasAuthenticatedClaims &&
    !hasEditorRole(data?.claims)
  ) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/dashboard';
    destination.searchParams.set('access', 'admin-required');

    const redirectResponse = NextResponse.redirect(destination);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    for (const header of ['cache-control', 'expires', 'pragma']) {
      const value = response.headers.get(header);
      if (value) redirectResponse.headers.set(header, value);
    }
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/articles/preview/:path*', '/dashboard/:path*'],
};
