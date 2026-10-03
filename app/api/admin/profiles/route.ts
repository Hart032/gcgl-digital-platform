import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/supabase/authorization';

export async function GET() {
  const authorization = await authorizeRequest('admin');
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: authorization.status });
  }

  const [profilesResult, subscriptionsResult] = await Promise.all([
    authorization.client
      .from('profiles')
      .select('user_id, full_name, phone, region, membership_tier, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100),
    authorization.client
      .from('subscriptions')
      .select('user_id, plan, status, next_renewal_at, updated_at')
      .limit(100),
  ]);

  if (profilesResult.error || subscriptionsResult.error) {
    console.error('Unable to load administrative profiles:', profilesResult.error?.message ?? subscriptionsResult.error?.message);
    return NextResponse.json({ error: 'Unable to load user records.' }, { status: 500 });
  }

  const subscriptionsByUser = new Map((subscriptionsResult.data ?? []).map((record) => [record.user_id, record]));
  const profiles = (profilesResult.data ?? []).map((profile) => ({
    ...profile,
    subscription: subscriptionsByUser.get(profile.user_id) ?? null,
  }));

  return NextResponse.json({ profiles }, { headers: { 'Cache-Control': 'private, no-store' } });
}