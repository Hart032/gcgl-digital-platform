BEGIN;

SELECT plan(13);

INSERT INTO public.articles (title, category, content, published_at, status)
VALUES
	('RLS published fixture', 'Testing', 'Published fixture', now(), 'published'),
	('RLS draft fixture', 'Testing', 'Draft fixture', now(), 'draft');

SELECT ok(
	(SELECT relrowsecurity FROM pg_class WHERE oid = 'public.articles'::regclass),
	'row-level security is enabled for articles'
);
SELECT ok(
	has_table_privilege('anon', 'public.articles', 'select'),
	'anonymous users can select articles'
);
SELECT ok(
	NOT has_table_privilege('anon', 'public.articles', 'insert,update,delete'),
	'anonymous users cannot write articles'
);

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{}';
SELECT is(
	(SELECT count(*)::integer FROM public.articles WHERE title LIKE 'RLS % fixture'),
	1,
	'anonymous users see only the published fixture'
);
SELECT throws_ok(
	$$INSERT INTO public.articles (title, category, content, published_at, status)
		VALUES ('RLS anonymous insert', 'Testing', 'Blocked', now(), 'published')$$,
	'42501',
	NULL,
	'anonymous users cannot insert articles'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"app_metadata":{"role":"registered"}}';
SELECT is(
	(SELECT count(*)::integer FROM public.articles WHERE title LIKE 'RLS % fixture'),
	1,
	'authenticated non-editors see only the published fixture'
);
SELECT throws_ok(
	$$INSERT INTO public.articles (title, category, content, published_at, status)
		VALUES ('RLS non-editor insert', 'Testing', 'Blocked', now(), 'draft')$$,
	'42501',
	NULL,
	'authenticated non-editors cannot insert articles'
);

SET LOCAL request.jwt.claims = '{"app_metadata":{"role":"editor"}}';
SELECT is(
	(SELECT count(*)::integer FROM public.articles WHERE title LIKE 'RLS % fixture'),
	2,
	'editors can see drafts'
);
SELECT results_eq(
	$$INSERT INTO public.articles (title, category, content, published_at, status)
		VALUES ('RLS editor insert', 'Testing', 'Allowed', now(), 'draft')
		RETURNING title$$,
	ARRAY['RLS editor insert'],
	'editors can insert articles'
);
SELECT results_eq(
	$$UPDATE public.articles SET status = 'published'
		WHERE title = 'RLS editor insert'
		RETURNING status$$,
	ARRAY['published'],
	'editors can update articles'
);
SELECT results_eq(
	$$DELETE FROM public.articles
		WHERE title = 'RLS editor insert'
		RETURNING title$$,
	ARRAY['RLS editor insert'],
	'editors can delete articles'
);

SET LOCAL request.jwt.claims = '{"app_metadata":{"role":"admin"}}';
SELECT is(
	(SELECT count(*)::integer FROM public.articles WHERE title LIKE 'RLS % fixture'),
	2,
	'admins can read drafts'
);
SELECT results_eq(
	$$INSERT INTO public.articles (title, category, content, published_at, status)
		VALUES ('RLS admin insert', 'Testing', 'Allowed', now(), 'draft')
		RETURNING title$$,
	ARRAY['RLS admin insert'],
	'admins can create articles'
);

SELECT * FROM finish();
ROLLBACK;
