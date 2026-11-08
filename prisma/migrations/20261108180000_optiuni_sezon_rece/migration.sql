-- O opțiune se poate adăuga singură în sezonul rece (octombrie–aprilie):
-- tipic, încălzirea unui teren acoperit cu balon.
ALTER TABLE "field_extras" ADD COLUMN "autoLaFrig" BOOLEAN NOT NULL DEFAULT false;
