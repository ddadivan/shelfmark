-- Domain rules (#398): a link's domain puts it into a folder and adds tags. Expand only: a new table.

-- CreateTable
CREATE TABLE "link_rules" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "domain" VARCHAR(253) NOT NULL,
    "folder_id" UUID,
    "tag_names" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "link_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "link_rules_folder_id_idx" ON "link_rules"("folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "link_rules_user_id_domain_key" ON "link_rules"("user_id", "domain");

-- AddForeignKey
ALTER TABLE "link_rules" ADD CONSTRAINT "link_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_rules" ADD CONSTRAINT "link_rules_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written (Prisma cannot express CHECKs): the shapes the API writes (RULE_LIMIT in contracts).
ALTER TABLE "link_rules" ADD CONSTRAINT "link_rules_domain_check"
  CHECK ("domain" = lower("domain") AND char_length("domain") BETWEEN 3 AND 253 AND "domain" NOT LIKE 'www.%');
ALTER TABLE "link_rules" ADD CONSTRAINT "link_rules_tag_names_check"
  CHECK ("tag_names" IS NOT NULL AND cardinality("tag_names") <= 5);
