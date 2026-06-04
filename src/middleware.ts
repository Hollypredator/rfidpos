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
    if (profile?.role === 'super_admin' || profile?.role === 'platform_owner') {
      url.pathname = '/superadmin';
    } else if (profile?.role === 'hotel_admin' || profile?.role === 'manager') {
      url.pathname = '/dashboard';
    } else if (profile?.role === 'receptionist') {
      url.pathname = '/dashboard/reception';
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

    const role = profile?.role || '';

    if (path.startsWith('/superadmin') && role !== 'super_admin' && role !== 'platform_owner') {
      const url = request.nextUrl.clone();
      url.pathname = role === 'receptionist' ? '/dashboard/reception' : ['hotel_admin', 'manager'].includes(role) ? '/dashboard' : '/pos';
      return NextResponse.redirect(url);
    }

    if (path.startsWith('/dashboard')) {
      // 1. Overview Page (exact /dashboard path) - requires hotel_admin or manager
      if (path === '/dashboard' && !['hotel_admin', 'manager', 'platform_owner'].includes(role)) {
        const url = request.nextUrl.clone();
        url.pathname = role === 'receptionist' ? '/dashboard/reception' : '/pos';
        return NextResponse.redirect(url);
      }

      // 2. Users and Settings Pages - require hotel_admin
      if ((path.startsWith('/dashboard/users') || path.startsWith('/dashboard/settings')) && !['hotel_admin', 'platform_owner'].includes(role)) {
        const url = request.nextUrl.clone();
        url.pathname = role === 'receptionist' ? '/dashboard/reception' : '/dashboard';
        return NextResponse.redirect(url);
      }

      // 3. Reports and Transactions Pages - require hotel_admin or manager
      if ((path.startsWith('/dashboard/reports') || path.startsWith('/dashboard/transactions')) && !['hotel_admin', 'manager', 'platform_owner'].includes(role)) {
        const url = request.nextUrl.clone();
        url.pathname = role === 'receptionist' ? '/dashboard/reception' : '/dashboard';
        return NextResponse.redirect(url);
      }

      // 4. All other dashboard pages (reception, rooms, guests) - require hotel_admin, manager, receptionist
      if (!['hotel_admin', 'manager', 'receptionist', 'platform_owner'].includes(role)) {
        const url = request.nextUrl.clone();
        url.pathname = '/pos';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
