BEGIN;
SELECT plan(14);

INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
VALUES
	('11111111-1111-4111-8111-111111111111', 'epaper-admin@example.test', '{"role":"admin"}', '{}'),
	('22222222-2222-4222-8222-222222222222', 'epaper-active@example.test', '{"role":"registered"}', '{}'),
	('33333333-3333-4333-8333-333333333333', 'epaper-inactive@example.test', '{"role":"registered"}', '{}'),
	('44444444-4444-4444-8444-444444444444', 'epaper-editor@example.test', '{"role":"editor"}', '{}');

INSERT INTO public.epaper_issues (id, title, issue_date, edition, pdf_storage_path, status, created_by, published_at)
VALUES
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'E-Paper published fixture', current_date, 'Test', 'issues/published-fixture.pdf', 'published', '11111111-1111-4111-8111-111111111111', now()),
	('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'E-Paper draft fixture', current_date - 1, 'Test', 'issues/draft-fixture.pdf', 'draft', '11111111-1111-4111-8111-111111111111', NULL);

INSERT INTO storage.objects (bucket_id, name, owner_id, metadata)
VALUES
	('epaper', 'issues/published-fixture.pdf', '11111111-1111-4111-8111-111111111111', '{"mimetype":"application/pdf","size":100}'),
	('epaper', 'issues/draft-fixture.pdf', '11111111-1111-4111-8111-111111111111', '{"mimetype":"application/pdf","size":100}');

UPDATE public.subscriptions
SET status = 'active', next_renewal_at = now() + interval '30 days'
WHERE user_id = '22222222-2222-4222-8222-222222222222';

SELECT ok(
	(SELECT relrowsecurity FROM pg_class WHERE oid = 'public.epaper_issues'::regclass),
	'row-level security is enabled for E-Paper issues'
);
SELECT ok(
	NOT has_table_privilege('anon', 'public.epaper_issues', 'insert,update,delete'),
	'anonymous users cannot manage E-Paper issues'
);

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{}';
SELECT is(
	(SELECT count(*)::integer FROM public.epaper_issues WHERE title LIKE 'E-Paper % fixture'),
	1,
	'visitors see published metadata but not drafts'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
SET LOCAL request.jwt.claims = '{"sub":"33333333-3333-4333-8333-333333333333","app_metadata":{"role":"registered"}}';
SELECT results_eq(
	$$SELECT title FROM public.epaper_issues WHERE title = 'E-Paper published fixture'$$,
	ARRAY['E-Paper published fixture'],
	'inactive members can browse published issue metadata'
);
SELECT is_empty(
	$$SELECT name FROM storage.objects WHERE name = 'issues/published-fixture.pdf'$$,
	'inactive members cannot read private PDFs'
);
SELECT throws_ok(
	$$INSERT INTO public.epaper_issues (title, issue_date, edition, pdf_storage_path, created_by)
		VALUES ('E-Paper member insert', current_date, 'Test member', 'issues/member.pdf', '33333333-3333-4333-8333-333333333333')$$,
	'42501',
	NULL,
	'members cannot create issues'
);
SELECT throws_ok(
	$$INSERT INTO storage.objects (bucket_id, name, owner_id, metadata)
		VALUES ('epaper', 'issues/member-upload.pdf', '33333333-3333-4333-8333-333333333333', '{"mimetype":"application/pdf"}')$$,
	'42501',
	NULL,
	'members cannot upload PDFs'
);

SET LOCAL request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
SET LOCAL request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","app_metadata":{"role":"registered"}}';
SELECT results_eq(
	$$SELECT name FROM storage.objects WHERE name = 'issues/published-fixture.pdf'$$,
	ARRAY['issues/published-fixture.pdf'],
	'active members can read PDFs linked to published issues'
);
SELECT is_empty(
	$$SELECT name FROM storage.objects WHERE name = 'issues/draft-fixture.pdf'$$,
	'active members cannot read PDFs for draft issues'
);

SET LOCAL request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
SET LOCAL request.jwt.claims = '{"sub":"44444444-4444-4444-8444-444444444444","app_metadata":{"role":"editor"}}';
SELECT is_empty(
	$$SELECT id FROM public.epaper_issues WHERE title = 'E-Paper draft fixture'$$,
	'editors cannot read unpublished issues'
);
SELECT is_empty(
	$$SELECT name FROM storage.objects WHERE name = 'issues/published-fixture.pdf'$$,
	'editors cannot read subscriber PDFs'
);

SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","app_metadata":{"role":"admin"}}';
SELECT is(
	(SELECT count(*)::integer FROM public.epaper_issues WHERE title LIKE 'E-Paper % fixture'),
	2,
	'admins can read drafts and published issues'
);
SELECT results_eq(
	$$SELECT name FROM storage.objects WHERE name = 'issues/draft-fixture.pdf'$$,
	ARRAY['issues/draft-fixture.pdf'],
	'admins can preview private PDFs for drafts'
);
SELECT results_eq(
	$$INSERT INTO public.epaper_issues (title, issue_date, edition, pdf_storage_path)
		VALUES ('E-Paper admin insert', current_date, 'Admin test', 'issues/admin.pdf')
		RETURNING title$$,
	ARRAY['E-Paper admin insert'],
	'admins can create issues'
);

SELECT * FROM finish();
ROLLBACK;
