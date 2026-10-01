BEGIN;
SELECT plan(17);

INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
VALUES
	('11111111-1111-4111-8111-111111111111', 'rbac-admin@example.test', '{"role":"admin"}', '{"full_name":"RBAC Admin"}'),
	('22222222-2222-4222-8222-222222222222', 'rbac-member@example.test', '{}', '{"full_name":"RBAC Member"}'),
	('44444444-4444-4444-8444-444444444444', 'rbac-editor@example.test', '{"role":"editor"}', '{"full_name":"RBAC Editor"}'),
	('33333333-3333-4333-8333-333333333333', 'rbac-other@example.test', '{}', '{"full_name":"Other Member"}');

SELECT is(
	(SELECT raw_app_meta_data ->> 'role' FROM auth.users WHERE id = '22222222-2222-4222-8222-222222222222'),
	'registered',
	'new accounts receive the registered role in protected app metadata'
);
SELECT is(
	(SELECT raw_app_meta_data ->> 'role' FROM auth.users WHERE id = '11111111-1111-4111-8111-111111111111'),
	'admin',
	'preassigned administrative roles are preserved'
);

SELECT ok(
	(SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass),
	'row-level security is enabled for profiles'
);
SELECT ok(
	(SELECT relrowsecurity FROM pg_class WHERE oid = 'public.subscriptions'::regclass),
	'row-level security is enabled for subscriptions'
);
SELECT ok(
	NOT has_table_privilege('anon', 'public.profiles', 'select,insert,update,delete'),
	'anonymous users have no profile access'
);
SELECT ok(
	NOT has_table_privilege('anon', 'public.subscriptions', 'select,insert,update,delete'),
	'anonymous users have no subscription access'
);
SELECT ok(
	NOT has_column_privilege('authenticated', 'public.profiles', 'user_id', 'update'),
	'authenticated users cannot change profile ownership or role identity'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
SET LOCAL request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","app_metadata":{"role":"registered"}}';

SELECT results_eq(
	$$SELECT full_name FROM public.profiles WHERE user_id = '22222222-2222-4222-8222-222222222222'$$,
	ARRAY['RBAC Member'],
	'members can read their own profile'
);
SELECT is_empty(
	$$SELECT user_id FROM public.profiles WHERE user_id = '33333333-3333-4333-8333-333333333333'$$,
	'members cannot read another profile'
);
SELECT results_eq(
	$$UPDATE public.profiles SET full_name = 'Updated Member' WHERE user_id = '22222222-2222-4222-8222-222222222222' RETURNING full_name$$,
	ARRAY['Updated Member'],
	'members can update their own profile'
);
SELECT is_empty(
	$$UPDATE public.subscriptions SET status = 'active' WHERE user_id = '22222222-2222-4222-8222-222222222222' RETURNING status$$,
	'members cannot change their subscription status'
);
SELECT results_eq(
	$$SELECT status FROM public.subscriptions WHERE user_id = '22222222-2222-4222-8222-222222222222'$$,
	ARRAY['inactive'],
	'denied subscription updates leave status unchanged'
);

SET LOCAL request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
SET LOCAL request.jwt.claims = '{"sub":"44444444-4444-4444-8444-444444444444","app_metadata":{"role":"editor"}}';
SELECT is_empty(
	$$SELECT user_id FROM public.profiles WHERE user_id = '22222222-2222-4222-8222-222222222222'$$,
	'editors cannot read subscriber profiles'
);
SELECT is_empty(
	$$UPDATE public.subscriptions SET status = 'active' WHERE user_id = '22222222-2222-4222-8222-222222222222' RETURNING status$$,
	'editors cannot manage subscriptions'
);

SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","app_metadata":{"role":"admin"}}';

SELECT is(
	(SELECT count(*)::integer FROM public.profiles WHERE user_id IN ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333')),
	2,
	'admins can read other profiles'
);
SELECT results_eq(
	$$UPDATE public.subscriptions SET status = 'active' WHERE user_id = '22222222-2222-4222-8222-222222222222' RETURNING status$$,
	ARRAY['active'],
	'admins can manage member subscriptions'
);
SELECT results_eq(
	$$UPDATE public.profiles SET region = 'Ashanti' WHERE user_id = '33333333-3333-4333-8333-333333333333' RETURNING region$$,
	ARRAY['Ashanti'],
	'admins can update another member profile'
);

SELECT * FROM finish();
ROLLBACK;
