-- Tambah kolom pin_hash untuk fitur kunci catatan dengan PIN
ALTER TABLE "notes" ADD COLUMN "pin_hash" TEXT;
