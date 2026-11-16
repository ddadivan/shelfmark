-- Per-folder "Highlight with background" (#440): a soft tint in the folder colour on its sidebar row
-- and its page header. A new column with a default, no data is rewritten.
-- AlterTable
ALTER TABLE "folders" ADD COLUMN "highlighted" BOOLEAN NOT NULL DEFAULT false;

-- The account-wide sidebar setting of #418 ("Highlight folders with their colour": off / stripe /
-- background) is replaced by the per-folder flag and retired; its CHECK goes with the column.
-- AlterTable
ALTER TABLE "users" DROP COLUMN "folder_highlight";
