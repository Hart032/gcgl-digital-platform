interface VideoPostProps {
  src: string;
  title: string;
  provider: string | null;
}

function getEmbedUrl(src: string, provider: string) {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  if (provider === 'youtube') {
    const allowedHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be']);
    if (!allowedHosts.has(url.hostname)) return null;
    const videoId = url.hostname.includes('youtu.be')
      ? url.pathname.split('/').filter(Boolean)[0]
      : url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    return videoId && /^[\w-]{11}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  }

  if (provider === 'vimeo') {
    if (!['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(url.hostname)) return null;
    const videoId = url.pathname.split('/').filter(Boolean).pop();
    return videoId && /^\d+$/.test(videoId) ? `https://player.vimeo.com/video/${videoId}` : null;
  }

  return null;
}

export default function VideoPost({ src, title, provider }: VideoPostProps) {
  if (provider === 'youtube' || provider === 'vimeo') {
    const embedUrl = getEmbedUrl(src, provider);
    if (!embedUrl) {
      return <p role="alert" className="my-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">This video URL is invalid for the selected provider.</p>;
    }
    return (
      <div className="my-4 aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  let isHttpsUrl = false;
  try {
    isHttpsUrl = new URL(src).protocol === 'https:';
  } catch {
    isHttpsUrl = false;
  }
  if (!isHttpsUrl) {
    return <p role="alert" className="my-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">This video URL is invalid.</p>;
  }
  return <video src={src} controls playsInline preload="metadata" className="my-4 max-h-[500px] w-full rounded-xl bg-black" />;
}
