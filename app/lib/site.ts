const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const deploymentUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;

export const siteUrl = new URL(configuredSiteUrl || deploymentUrl || 'http://localhost:3000');