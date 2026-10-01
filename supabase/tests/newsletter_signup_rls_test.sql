BEGIN;

SELECT plan(5);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.newsletter_signups'::regclass),
  'newsletter signup table has row-level security enabled'
);

SET LOCAL ROLE anon;
SELECT results_eq(
  $$INSERT INTO public.newsletter_signups (email)
    VALUES ('reader@example.com')
    RETURNING email$$,
  ARRAY['reader@example.com'],
  'anonymous visitors can join the newsletter'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"app_metadata":{"role":"editor"}}';
SELECT is(
  (SELECT count(*) FROM public.newsletter_signups),
  1,
  'editors can view the signup list'
);

SELECT * FROM finish();
ROLLBACK;
