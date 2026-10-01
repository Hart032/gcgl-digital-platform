BEGIN;

SELECT plan(6);

INSERT INTO public.articles (title, category, content, published_at, status)
VALUES ('Comment access fixture', 'Testing', 'Fixture article', now(), 'published');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.article_comments'::regclass),
  'row-level security is enabled for article comments'
);

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claims = '{}';
SELECT is(
  (SELECT count(*) FROM public.article_comments),
  0,
  'anonymous readers can access the comments list without creating rows'
);
SELECT throws_ok(
  $$INSERT INTO public.article_comments (article_id, user_id, display_name, comment)
    VALUES ((SELECT id FROM public.articles WHERE title = 'Comment access fixture'), '00000000-0000-0000-0000-000000000000', 'Guest', 'Blocked')$$,
  '42501',
  NULL,
  'anonymous users cannot create comments'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001"}';
SELECT results_eq(
  $$INSERT INTO public.article_comments (article_id, user_id, display_name, comment)
    VALUES ((SELECT id FROM public.articles WHERE title = 'Comment access fixture'), '00000000-0000-0000-0000-000000000001', 'Verified reader', 'Verified reader comment')
    RETURNING comment$$,
  ARRAY['Verified reader comment'],
  'authenticated users can add a comment using their own user id'
);

SELECT is(
  (SELECT count(*) FROM public.article_comments WHERE article_id = (SELECT id FROM public.articles WHERE title = 'Comment access fixture')),
  1,
  'comments are stored for the article'
);

SELECT * FROM finish();
ROLLBACK;
