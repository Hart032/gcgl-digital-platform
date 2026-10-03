This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase Access Control Setup

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project's Connect dialog. Add the same variables to the Vercel project settings for every deployment environment. Never use a service-role or secret key in these variables. `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` must be Paystack's `pk_test_...` or `pk_live_...` public key, never an `sk_...` secret key.
2. Roles are stored in trusted Supabase `app_metadata`: new accounts receive `{"role":"registered"}`. `admin` accounts can manage subscriber profiles and subscriptions; `editor` accounts retain editorial article/media permissions but cannot access subscriber records. Never assign roles through user metadata or a client-side profile update. To promote an account, use a trusted Supabase admin surface such as SQL Editor:

	```sql
	update auth.users
	set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
	where id = 'USER_UUID';
	```

	Replace `USER_UUID` with the intended account's Auth user ID, and have that user sign out and back in so their JWT receives the updated role. Use `{"role":"admin"}` for a superadmin or `{"role":"editor"}` for an editor; `/api/admin/*` requires the admin role.
	For this app, the trusted `admin` role is the **superadmin** tier; `editor` is the standard editorial tier. Editors can create, edit, and publish content, but cannot delete articles, manage ad campaigns, change membership tiers, manage subscribers, or administer E-Paper issues. Superadmin-only actions are enforced both in server routes and RLS, not just hidden in the UI. The RBAC hardening migration adds the database-side restrictions. Never grant either role through user-editable metadata or a client-side form.
3. Authenticate the CLI, identify the project ref, then link it. `npx supabase login` prompts for a Supabase personal access token from the dashboard's Account → Access Tokens page; enter it in the terminal, not in chat. `npx supabase projects list` shows projects available to that token. The project ref is also the subdomain in the Supabase URL.

	```bash
	npx supabase login
	npx supabase projects list
	npx supabase link --project-ref YOUR_PROJECT_REF
	```

4. Inspect pending migrations before applying them:

	```bash
	npx supabase db push --linked --dry-run
	npx supabase db push --linked
	```

	The RBAC migration creates owner-scoped `profiles` and `subscriptions` tables, defaults new users to the registered role, and limits subscriber-record management to admins. Ordinary users can update only their own profile fields. The `/api/profile` route enforces this contract; `/api/admin/profiles/*` requires an admin claim. Existing paid status must be populated from a trusted payment record by an administrator; the migration does not trust editable user metadata as proof of payment.
5. The migration assumes the project already has the `public.articles` table and its `status` column. The current image/video rendering uses public Storage URLs. Keep the `media` bucket public only if its contents are intended to be publicly retrievable; private draft media needs signed-URL handling before making that bucket private.

The policy tests are `supabase/tests/articles_rls_test.sql` and `supabase/tests/rbac_profiles_rls_test.sql`. Local tests require Docker Desktop/Podman and a local schema containing `public.articles`; start the stack with `npx supabase start`, then run `npx supabase db test --local`. Docker is not required for the remote `db push` workflow. `.env.local` is ignored by Git; keep its values private.

## E-Paper

Published editions are listed at `/epaper`; administrators upload, publish, unpublish, and remove issues at `/admin/epaper`. PDFs are stored in the private `epaper` bucket, limited to 100 MB, and served with a 30-minute signed URL. The database and Storage policies require an active subscription for published PDFs; admins can preview drafts. Access follows `subscriptions.status` and `next_renewal_at`, so a trusted payment process or administrator must mark a paid account active.

The E-Paper policy test is `supabase/tests/epaper_issues_rls_test.sql`. It runs with `npx supabase db test --local` when the local stack has pgTAP enabled.

## Reader and Brand Features

Apply `supabase/migrations/20261003044447_add_brand_membership_and_video_features.sql` after reviewing it for your project. It adds the `Gold`, `Silver`, and `Diamond` profile tier field with admin-only assignment, post type and video provider metadata, a brand label for E-Paper issues, active campaign ads with staff-only management, a category performance view, and comment policies that limit public reads to comments on published articles. Existing E-Paper rows receive the default brand `Daily Graphic`; update any rows that belong to another brand after migration.

The E-Paper admin form uses the canonical brand choices. Admins assign membership tiers in the admin portal; member dashboards show a tier but cannot change it. Article/video posts are managed in `/admin`, and published video posts are listed at `/tv`. The admin portal also manages ad drafts and exposes article lifetime views and comment counts by category; ad slots render when a matching brand category is selected on the homepage. `BackToTop` is included by the root layout.

Run the policy tests against the local database with `npx supabase db test --local`. Build and lint checks are `npm run build` and `npm run lint`.
