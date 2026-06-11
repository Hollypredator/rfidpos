import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '../../../../utils/supabase-admin';
import { createServerSupabaseClient } from '../../../../utils/supabase-server';
import { UserRole } from '../../../../types';

type UserPayload = {
  id?: string;
  fullName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  tenantId?: string | null;
  isActive?: boolean;
};

const PLATFORM_ROLES = new Set<UserRole>(['platform_owner', 'super_admin']);
const TENANT_ADMIN_ROLES = new Set<UserRole>(['hotel_admin']);
const TENANT_MANAGED_ROLES = new Set<UserRole>(['manager', 'receptionist', 'waiter', 'cashier']);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getActorProfile() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: jsonError('Unauthorized', 401), profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, tenant_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: jsonError('Profile not found', 403), profile: null };
  }

  return { error: null, profile: profile as { id: string; tenant_id: string | null; role: UserRole } };
}

function authorize(
  actor: { tenant_id: string | null; role: UserRole },
  payload: UserPayload,
  action: 'create' | 'update' | 'delete'
) {
  if (PLATFORM_ROLES.has(actor.role)) return null;

  if (!TENANT_ADMIN_ROLES.has(actor.role) || !actor.tenant_id) {
    return 'Forbidden';
  }

  if (payload.role && !TENANT_MANAGED_ROLES.has(payload.role)) {
    return 'Hotel admins can only manage tenant staff roles.';
  }

  if (payload.tenantId !== actor.tenant_id) {
    return 'Hotel admins can only manage users in their own tenant.';
  }

  return null;
}

function normalizeTenantId(role?: UserRole, tenantId?: string | null) {
  if (role && PLATFORM_ROLES.has(role)) return null;
  return tenantId || null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as UserPayload;
  if (!body.email || !body.fullName || !body.role || !body.password) {
    return jsonError('email, fullName, role and password are required.', 400);
  }

  const tenantId = normalizeTenantId(body.role, body.tenantId);
  const payload = { ...body, tenantId };
  const { error, profile: actor } = await getActorProfile();
  if (error || !actor) return error;

  const authError = authorize(actor, payload, 'create');
  if (authError) return jsonError(authError, 403);

  const admin = createSupabaseAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.fullName, role: body.role },
  });

  if (createError || !created.user) {
    return jsonError(createError?.message || 'User could not be created.', 400);
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: created.user.id,
      tenant_id: tenantId,
      full_name: body.fullName,
      email: body.email,
      role: body.role,
      is_active: body.isActive ?? true,
    })
    .select('*')
    .single();

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return jsonError(profileError.message, 400);
  }

  return NextResponse.json({ profile }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as UserPayload;
  if (!body.id || !body.fullName || !body.role) {
    return jsonError('id, fullName and role are required.', 400);
  }

  const tenantId = normalizeTenantId(body.role, body.tenantId);
  const payload = { ...body, tenantId };
  const { error, profile: actor } = await getActorProfile();
  if (error || !actor) return error;

  const authError = authorize(actor, payload, 'update');
  if (authError) return jsonError(authError, 403);

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .update({
      tenant_id: tenantId,
      full_name: body.fullName,
      role: body.role,
      is_active: body.isActive ?? true,
    })
    .eq('id', body.id)
    .select('*')
    .single();

  if (profileError) return jsonError(profileError.message, 400);

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(body.id, {
    user_metadata: { full_name: body.fullName, role: body.role },
  });
  if (authUpdateError) return jsonError(authUpdateError.message, 400);

  return NextResponse.json({ profile });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as UserPayload;
  if (!body.id) return jsonError('id is required.', 400);

  const { error, profile: actor } = await getActorProfile();
  if (error || !actor) return error;

  const admin = createSupabaseAdminClient();
  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('id, tenant_id, role')
    .eq('id', body.id)
    .single();

  if (targetError || !target) return jsonError('User not found.', 404);

  const authError = authorize(actor, { tenantId: target.tenant_id, role: target.role }, 'delete');
  if (authError) return jsonError(authError, 403);

  const { error: deleteError } = await admin.auth.admin.deleteUser(body.id);
  if (deleteError) return jsonError(deleteError.message, 400);

  await admin.from('profiles').delete().eq('id', body.id);

  return NextResponse.json({ ok: true });
}
