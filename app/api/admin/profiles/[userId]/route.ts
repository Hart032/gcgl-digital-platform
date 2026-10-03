import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/supabase/authorization';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROFILE_FIELDS = ['full_name', 'phone', 'region', 'membership_tier'] as const;
const MEMBERSHIP_TIERS = ['Gold', 'Silver', 'Diamond'] as const;
const SUBSCRIPTION_PLANS = ['Premium Monthly', 'Premium Annual', 'Family Bundle'] as const;
const SUBSCRIPTION_STATUSES = ['inactive', 'active', 'paused', 'cancelled'] as const;

export async function PATCH(request: Request, { params }: RouteContext) {
  const authorization = await authorizeRequest('admin');
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }

  const { userId } = await params;
  if (!UUID_PATTERN.test(userId)) {
    return NextResponse.json({ error: 'A valid user ID is required.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A valid JSON body is required.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Provide a profile or subscription update.' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const keys = Object.keys(payload);
  if (keys.length !== 1 || (keys[0] !== 'profile' && keys[0] !== 'subscription')) {
    return NextResponse.json({ error: 'Only profile or subscription fields can be updated.' }, { status: 400 });
  }

  if (keys[0] === 'profile') {
    const value = payload.profile;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return NextResponse.json({ error: 'Provide valid profile fields.' }, { status: 400 });
    }

    const entries = Object.entries(value);
    if (
      entries.length === 0 ||
      entries.some(([key, fieldValue]) => {
        if (!PROFILE_FIELDS.includes(key as (typeof PROFILE_FIELDS)[number])) return true;
        if (key === 'membership_tier') {
          return fieldValue !== null && (
            typeof fieldValue !== 'string' ||
            !MEMBERSHIP_TIERS.includes(fieldValue as (typeof MEMBERSHIP_TIERS)[number])
          );
        }
        return typeof fieldValue !== 'string' || fieldValue.length > 160;
      })
    ) {
      return NextResponse.json({ error: 'Provide valid profile fields only.' }, { status: 400 });
    }

    const updates = Object.fromEntries(entries.map(([key, fieldValue]) => [
      key,
      key === 'membership_tier' ? fieldValue : (fieldValue as string).trim(),
    ]));
    const { data, error } = await authorization.client
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select('user_id, full_name, phone, region, membership_tier, updated_at')
      .maybeSingle();

    if (error) {
      console.error('Unable to update user profile:', error.message);
      return NextResponse.json({ error: 'Unable to update the user profile.' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });

    return NextResponse.json({ profile: data }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  const value = payload.subscription;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return NextResponse.json({ error: 'Provide valid subscription fields.' }, { status: 400 });
  }

  const entries = Object.entries(value);
  const allowedFields = ['plan', 'status', 'next_renewal_at'];
  if (entries.length === 0 || entries.some(([key]) => !allowedFields.includes(key))) {
    return NextResponse.json({ error: 'Provide subscription fields only.' }, { status: 400 });
  }

  const updates: { plan?: string; status?: string; next_renewal_at?: string | null } = {};
  for (const [key, fieldValue] of entries) {
    if (key === 'plan') {
      if (typeof fieldValue !== 'string' || !SUBSCRIPTION_PLANS.includes(fieldValue as (typeof SUBSCRIPTION_PLANS)[number])) {
        return NextResponse.json({ error: 'Invalid subscription plan.' }, { status: 400 });
      }
      updates.plan = fieldValue;
    } else if (key === 'status') {
      if (typeof fieldValue !== 'string' || !SUBSCRIPTION_STATUSES.includes(fieldValue as (typeof SUBSCRIPTION_STATUSES)[number])) {
        return NextResponse.json({ error: 'Invalid subscription status.' }, { status: 400 });
      }
      updates.status = fieldValue;
    } else {
      if (fieldValue !== null && (typeof fieldValue !== 'string' || !Number.isFinite(Date.parse(fieldValue)))) {
        return NextResponse.json({ error: 'Invalid renewal date.' }, { status: 400 });
      }
      updates.next_renewal_at = fieldValue as string | null;
    }
  }

  const { data, error } = await authorization.client
    .from('subscriptions')
    .update(updates)
    .eq('user_id', userId)
    .select('user_id, plan, status, next_renewal_at, updated_at')
    .maybeSingle();

  if (error) {
    console.error('Unable to update user subscription:', error.message);
    return NextResponse.json({ error: 'Unable to update the user subscription.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'User subscription not found.' }, { status: 404 });

  return NextResponse.json({ subscription: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}