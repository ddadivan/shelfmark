-- AI-2 (#390, ADR 0050): "Not now" on a rule offer, one row per user and site (as `ruleHost`
-- returns it). Rules data, not AI data: it cascades with the account, not with DELETE /api/ai/data.
CREATE TABLE "rule_offer_dismissals" (
    "user_id" UUID NOT NULL,
    "domain" VARCHAR(253) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_offer_dismissals_pkey" PRIMARY KEY ("user_id","domain")
);

ALTER TABLE "rule_offer_dismissals" ADD CONSTRAINT "rule_offer_dismissals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The Tidy list and count read a user's open suggestions.
CREATE INDEX "link_suggestions_user_id_state_idx" ON "link_suggestions"("user_id", "state");
