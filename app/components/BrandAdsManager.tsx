'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

const BRANDS = ['Daily Graphic', 'The Mirror', 'Graphic Showbiz', 'Graphic Sports', 'Graphic Business', 'Junior Graphic'];
const PLACEMENTS = ['brand_header', 'story_feed', 'sidebar'] as const;

type Placement = (typeof PLACEMENTS)[number];
type Campaign = {
  id: string;
  brand: string;
  headline: string;
  placement: Placement;
  status: 'draft' | 'active' | 'paused';
};

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950';

export default function BrandAdsManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brand, setBrand] = useState(BRANDS[0]);
  const [headline, setHeadline] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [placement, setPlacement] = useState<Placement>('story_feed');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [isSaving, setIsSaving] = useState(false);

  const loadCampaigns = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('brand_ads')
      .select('id, brand, headline, placement, status')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('Unable to load ad campaigns:', error.message);
      setMessage('Could not load ads. Apply the platform features migration, then retry.');
    } else {
      setCampaigns((data as Campaign[]) ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase
      .from('brand_ads')
      .select('id, brand, headline, placement, status')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Unable to load ad campaigns:', error.message);
          setMessage('Could not load ads. Apply the platform features migration, then retry.');
        } else {
          setCampaigns((data as Campaign[]) ?? []);
        }
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const createCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setMessage('Supabase is not configured.');
      return;
    }

    let safeImageUrl: URL;
    let safeTargetUrl: URL;
    try {
      safeImageUrl = new URL(imageUrl);
      safeTargetUrl = new URL(targetUrl);
    } catch {
      setMessage('Enter valid image and destination URLs.');
      return;
    }
    if (safeImageUrl.protocol !== 'https:' || safeTargetUrl.protocol !== 'https:') {
      setMessage('Advertisement image and destination links must use HTTPS.');
      return;
    }

    setIsSaving(true);
    setMessage('');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setIsSaving(false);
      setMessage('Sign in with an editorial account to manage ads.');
      return;
    }

    const { error } = await supabase.from('brand_ads').insert({
      brand,
      headline: headline.trim(),
      image_url: safeImageUrl.toString(),
      target_url: safeTargetUrl.toString(),
      alt_text: altText.trim(),
      placement,
      created_by: userData.user.id,
      status: 'draft',
    });

    setIsSaving(false);
    if (error) {
      console.error('Unable to save ad campaign:', error.message);
      setMessage('Could not save this ad. Check your staff role and the submitted fields.');
      return;
    }
    setHeadline('');
    setImageUrl('');
    setTargetUrl('');
    setAltText('');
    setMessage('Ad saved as a draft.');
    await loadCampaigns();
  };

  const toggleCampaign = async (campaign: Campaign) => {
    if (!supabase) return;
    const status = campaign.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase.from('brand_ads').update({ status }).eq('id', campaign.id);
    if (error) {
      console.error('Unable to update ad campaign:', error.message);
      setMessage('Could not update this ad. Check your staff role and try again.');
      return;
    }
    setCampaigns((current) => current.map((item) => item.id === campaign.id ? { ...item, status } : item));
  };

  return (
    <section aria-labelledby="brand-ads-title" className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-700 dark:text-red-400">Campaigns</p>
        <h2 id="brand-ads-title" className="mt-1 text-xl font-bold">Brand advertisements</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">New ads start as drafts. Activate them after checking the creative and destination.</p>
      </div>

      {message && <p role="status" className="text-sm text-gray-600 dark:text-zinc-300">{message}</p>}

      <form onSubmit={(event) => void createCampaign(event)} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Brand
          <select value={brand} onChange={(event) => setBrand(event.target.value)} className={`${inputClass} mt-1`}>
            {BRANDS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Placement
          <select value={placement} onChange={(event) => setPlacement(event.target.value as Placement)} className={`${inputClass} mt-1`}>
            {PLACEMENTS.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold sm:col-span-2">Headline
          <input required maxLength={160} value={headline} onChange={(event) => setHeadline(event.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm font-semibold">Image URL (HTTPS)
          <input required type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm font-semibold">Destination URL (HTTPS)
          <input required type="url" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">Image alt text
          <input required maxLength={250} value={altText} onChange={(event) => setAltText(event.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <button type="submit" disabled={isSaving} className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60 sm:col-span-2">
          {isSaving ? 'Saving...' : 'Save draft'}
        </button>
      </form>

      <ul className="divide-y divide-gray-200 dark:divide-zinc-800">
        {isLoading ? <li className="py-4 text-sm text-gray-500">Loading campaigns...</li> : campaigns.length === 0 ?
          <li className="py-4 text-sm text-gray-500">No ad campaigns yet.</li> :
          campaigns.map((campaign) => (
            <li key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">{campaign.headline}</p>
                <p className="text-xs text-gray-500">{campaign.brand} · {campaign.placement.replace('_', ' ')} · {campaign.status}</p>
              </div>
              <button
                type="button"
                onClick={() => void toggleCampaign(campaign)}
                className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {campaign.status === 'active' ? 'Pause' : 'Activate'}
              </button>
            </li>
          ))}
      </ul>
    </section>
  );
}
