# MeroPasal Banner Data URI Migration

**Audit date:** November 19, 2026
**Firebase project:** `meropasal-ce87a`
**Collection:** `banners`
**Status:** Mapping verified from production homepage Flight data; no Storage uploads or Firestore updates performed.

## Exact mapping

Each JPEG was extracted from a production homepage Flight data URI and matched by the Flight reference used by the serialized banner object. SHA-256 and byte length identify the exact source bytes. All four files are 1200×670 JPEGs.

| Banner title | Firestore document ID | Position | Source ref | Bytes | SHA-256 |
|---|---|---|---:|---:|---|
| Adivasi | `3e3QUNpjyd5NdfratycI` | hero | `$1e` | 125,436 | `6276E5A88F8D1B3D0C12EC772A726A618E31590AE5B42B12C20D98453DCC7C79` |
| Paras | `5k33LH23jkCciRwI0Pbe` | hero | `$1f` | 112,234 | `A287069C3358A6027454C91DD890FBAE953418045D2C0CF36109DDE42E727C48` |
| Japanese | `IrpVLFq0MGpSLWjon2yn` | hero | `$20` | 133,493 | `16643456788103589845D98D5013A2CC32EAF29868F5BE3A6959D5481FE8D4FA` |
| Eczemar | `f2ywXjqdcB6BtI97yAAT` | hero | `$21` | 133,587 | `E79798206175AF4E015A2758ECEC50D6CB2371C2B5377058061F437375EAC6E1` |

The fourth record is **Eczemar**. The homepage payload contained all four `image` references and the corresponding four JPEG rows. The migration script rechecks each live document's ID, title, position, original data URI, byte length, and SHA-256 before upload, so it refuses to proceed if production data changed after this capture.

## Prepared migration

Run from the repository root after configuring Firebase Application Default Credentials for the MeroPasal project and ensuring `.env.local` contains the correct project and Storage bucket:

```powershell
node scripts/migrate-banner-data-uris.mjs
node scripts/migrate-banner-data-uris.mjs --apply
```

The first command is read-only. The second uploads exact bytes to unique Storage object paths, checks each download URL and re-hashes the returned image, then asks for the phrase `UPDATE 4 MEROPASAL BANNERS`. Only after all four URLs verify does one Firestore transaction update the four `image` fields. It does not modify other banner fields, delete objects, or change rules/schema. Failed verification leaves the original banner values intact; failed/cancelled runs may leave new Storage objects, which is safe to clean up after review.

## Access and verification limits

- Firebase CLI can list project `meropasal-ce87a` as active, but no Google Application Default Credentials are configured in this workspace (`gcloud` is unavailable and `GOOGLE_APPLICATION_CREDENTIALS` is unset).
- The browser automation integration could not open the available Chrome session, so the authenticated admin banner editor was unavailable.
- The prepared script passes `node --check`. Its read-only default was attempted and stopped before Firestore access because Application Default Credentials could not be loaded.
- No Storage object was uploaded and no production Firestore record was modified. The original data URI values remain the source of truth.
- Because no data update occurred, Storage URL checks, post-update homepage HTML size, mobile banner rendering, navigation, SEO, and fallback tests remain pending.
- The known before sample is 1,924,731 HTML bytes. The eight data-URI occurrences account for 1,335,324 bytes of that sample; this is the HTML-only reduction upper bound before replacement URL text, not a measured transfer saving.
