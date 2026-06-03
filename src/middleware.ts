import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// If Supabase is not configured, skip auth checks entirely (design/dev mode)
const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('placeholder');

export async function middleware(request: NextRequest) {
  // ── DEV MODE: No Supabase → allow all routes ──
  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  // ── PRODUCTION MODE: Full auth checks ──
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // APK kullanıcıları için ana sayfayı pas geçip doğrudan login sayfasına yönlendir
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.includes('RFIDPOS-Android') && path === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const publicRoutes = ['/', '/login', '/register', '/forgot-password'];
  const isPublicRoute = publicRoutes.includes(path);

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  if (user && (path === '/login' || path === '/register')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();
    if (profile?.role === 'super_admin') {
      url.pathname = '/superadmin';
    } else if (profile?.role === 'hotel_admin' || profile?.role === 'manager') {
      url.pathname = '/dashboard';
    } else {
      url.pathname = '/pos';
    }
    return NextResponse.redirect(url);
  }

  if (user && (path.startsWith('/superadmin') || path.startsWith('/dashboard'))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (path.startsWith('/superadmin') && profile?.role !== 'super_admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    if (path.startsWith('/dashboard') && !['hotel_admin', 'manager', 'super_admin'].includes(profile?.role || '')) {
      const url = request.nextUrl.clone();
      url.pathname = '/pos';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
