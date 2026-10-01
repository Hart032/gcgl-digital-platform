import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/supabase/authorization';

const PROFILE_FIELDS = ['full_name', 'phone', 'region'] as const;

type ProfileField = (typeof PROFILE_FIELDS)[number];

function parseProfileUpdates(value: unknown): Partial<Record<ProfileField, string>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const entries = Object.entries(value);
  if (entries.length === 0 || entries.some(([key]) => !PROFILE_FIELDS.includes(key as ProfileField))) {
    return null;
  }

  const updates: Partial<Record<ProfileField, string>> = {};
  for (const [key, fieldValue] of entries) {
    if (typeof fieldValue !== 'string' || fieldValue.length > 160) return null;
    updates[key as ProfileField] = fieldValue.trim();
  }

  return updates;
}

export async function GET() {
  const authorization = await authorizeRequest('registered');
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }

  const { data: profile, error: profileError } = await authorization.client
    .from('profiles')
    .select('user_id, full_name, phone, region, updated_at')
    .eq('user_id', authorization.userId)
    .maybeSingle();

  const { data: subscription, error: subscriptionError } = await authorization.client
    .from('subscriptions')
    .select('plan, status, next_renewal_at, updated_at')
    .eq('user_id', authorization.userId)
    .maybeSingle();

  if (profileError || subscriptionError) {
    console.error('Unable to load account details:', profileError?.message ?? subscriptionError?.message);
    return NextResponse.json({ error: 'Unable to load account details.' }, { status: 500 });
  }

  return NextResponse.json({ profile, subscription }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeRequest('registered');
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A valid JSON body is required.' }, { status: 400 });
  }

  const updates = parseProfileUpdates(body);
  if (!updates) {
    return NextResponse.json({ error: 'Provide valid profile fields only.' }, { status: 400 });
  }

  const { data, error } = await authorization.client
    .from('profiles')
    .update(updates)
    .eq('user_id', authorization.userId)
    .select('user_id, full_name, phone, region, updated_at')
    .single();

  if (error) {
    console.error('Unable to update profile:', error.message);
    return NextResponse.json({ error: 'Unable to update your profile.' }, { status: 500 });
  }

  return NextResponse.json({ profile: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}