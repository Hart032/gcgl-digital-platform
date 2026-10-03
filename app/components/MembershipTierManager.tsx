'use client';

import { useEffect, useState } from 'react';

type Profile = {
  user_id: string;
  full_name: string;
  membership_tier: 'Gold' | 'Silver' | 'Diamond' | null;
};

export default function MembershipTierManager() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingUser, setSavingUser] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch('/api/admin/profiles', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json() as { error?: string; profiles?: (Profile & { subscription?: unknown })[] };
        if (!response.ok) throw new Error(payload.error || 'Could not load member profiles.');
        return payload.profiles ?? [];
      })
      .then((data) => {
        if (active) setProfiles(data);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load member profiles.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const setTier = async (profile: Profile, membership_tier: Profile['membership_tier']) => {
    setSavingUser(profile.user_id);
    setError('');
    try {
      const response = await fetch(`/api/admin/profiles/${profile.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: { membership_tier } }),
      });
      const payload = await response.json() as { error?: string; profile?: Profile };
      if (!response.ok || !payload.profile) throw new Error(payload.error || 'Could not save this tier.');
      setProfiles((current) => current.map((item) => item.user_id === profile.user_id ? { ...item, membership_tier: payload.profile!.membership_tier } : item));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this tier.');
    } finally {
      setSavingUser(null);
    }
  };

  return (
    <section aria-labelledby="membership-tiers-title" className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-700 dark:text-red-400">Subscriber accounts</p>
        <h2 id="membership-tiers-title" className="mt-1 text-xl font-bold">Membership tiers</h2>
      </div>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      {loading ? <p className="text-sm text-gray-500">Loading profiles...</p> : profiles.length === 0 ?
        <p className="text-sm text-gray-500">No profiles available.</p> :
        <ul className="divide-y divide-gray-200 dark:divide-zinc-800">
          {profiles.map((profile) => (
            <li key={profile.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="font-medium">{profile.full_name || profile.user_id}</span>
              <select
                aria-label={`Membership tier for ${profile.full_name || profile.user_id}`}
                value={profile.membership_tier ?? ''}
                disabled={savingUser === profile.user_id}
                onChange={(event) => void setTier(profile, event.target.value ? event.target.value as Profile['membership_tier'] : null)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">No tier</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Diamond">Diamond</option>
              </select>
            </li>
          ))}
        </ul>}
    </section>
  );
}
