-- AI link kind (#535, ADR 0057): the user chose the link's kind in Edit link, so AI never changes it.
-- False for every existing row; set by PATCH with `kind`, cleared when a new URL recomputes the kind.

-- AlterTable
ALTER TABLE "links" ADD COLUMN     "kind_by_user" BOOLEAN NOT NULL DEFAULT false;
