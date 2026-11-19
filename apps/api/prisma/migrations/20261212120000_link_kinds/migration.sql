-- Ten link kinds (#537, ADR 0058): podcast, document, code, app, post and recipe join video, article,
-- shopping and other. Expand only: the CHECK is widened in one statement pair; no row changes, so
-- every existing link keeps its kind (the new kinds come from detection at save and from AI on `other`).

-- Hand-written (Prisma cannot express CHECKs).
ALTER TABLE "links" DROP CONSTRAINT "links_kind_check";
ALTER TABLE "links" ADD CONSTRAINT "links_kind_check"
  CHECK ("kind" IN ('video', 'article', 'shopping', 'podcast', 'document', 'code', 'app', 'post', 'recipe', 'other'));
