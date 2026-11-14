-- Ukrainian interface language (#404). Widens the allow-list of "users"."language" with 'uk'
-- (INTERFACE_LANGUAGE in the contracts). Expand only: every stored value stays valid, no data is
-- rewritten. Hand-written (Prisma cannot express CHECKs; its drift check ignores them).

ALTER TABLE "users" DROP CONSTRAINT "users_language_check";
ALTER TABLE "users" ADD CONSTRAINT "users_language_check" CHECK ("language" IN ('browser', 'en', 'fr', 'de', 'it', 'es', 'pt', 'uk'));
