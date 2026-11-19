import { createHash, randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import nextEnv from "@next/env";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

nextEnv.loadEnvConfig(process.cwd());

const EXPECTED_PROJECT_ID = "meropasal-ce87a";
const BANNERS_COLLECTION = "banners";
const expectedBanners = [
  {
    id: "3e3QUNpjyd5NdfratycI",
    title: "Adivasi",
    position: "hero",
    byteLength: 125436,
    sha256: "6276E5A88F8D1B3D0C12EC772A726A618E31590AE5B42B12C20D98453DCC7C79",
  },
  {
    id: "5k33LH23jkCciRwI0Pbe",
    title: "Paras",
    position: "hero",
    byteLength: 112234,
    sha256: "A287069C3358A6027454C91DD890FBAE953418045D2C0CF36109DDE42E727C48",
  },
  {
    id: "IrpVLFq0MGpSLWjon2yn",
    title: "Japanese",
    position: "hero",
    byteLength: 133493,
    sha256: "16643456788103589845D98D5013A2CC32EAF29868F5BE3A6959D5481FE8D4FA",
  },
  {
    id: "f2ywXjqdcB6BtI97yAAT",
    title: "Eczemar",
    position: "hero",
    byteLength: 133587,
    sha256: "E79798206175AF4E015A2758ECEC50D6CB2371C2B5377058061F437375EAC6E1",
  },
];

function getProjectId() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (projectId !== EXPECTED_PROJECT_ID) {
    throw new Error(`Expected Firebase project ${EXPECTED_PROJECT_ID}; refusing to use ${projectId || "an unset project"}.`);
  }
  return projectId;
}

function getBucketName() {
  const configuredBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!configuredBucket) {
    throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is required; no bucket will be guessed.");
  }
  return configuredBucket.replace(/^gs:\/\//, "").replace(/\/$/, "");
}

function decodeExpectedImage(dataUrl, expected) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/jpeg;base64,")) {
    throw new Error(`${expected.title} (${expected.id}) no longer contains the expected JPEG data URL.`);
  }

  const imageBytes = Buffer.from(dataUrl.slice("data:image/jpeg;base64,".length), "base64");
  const sha256 = createHash("sha256").update(imageBytes).digest("hex").toUpperCase();
  if (imageBytes.length !== expected.byteLength || sha256 !== expected.sha256) {
    throw new Error(`${expected.title} (${expected.id}) image bytes differ from the verified production capture.`);
  }
  return imageBytes;
}

function assertBannerRecord(snapshot, expected) {
  if (!snapshot.exists) throw new Error(`Banner document ${expected.id} does not exist.`);
  const data = snapshot.data();
  if (data.title !== expected.title || data.position !== expected.position) {
    throw new Error(`Banner ${expected.id} no longer matches the verified ${expected.title} hero record.`);
  }
  return decodeExpectedImage(data.image, expected);
}

function createStorageDownloadUrl(bucketName, objectPath, downloadToken) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const projectId = getProjectId();
  const bucketName = getBucketName();
  const app = initializeApp({
    credential: applicationDefault(),
    projectId,
    storageBucket: bucketName,
  });
  const firestore = getFirestore(app);
  const bucket = getStorage(app).bucket(bucketName);
  const documentRefs = expectedBanners.map((banner) => firestore.collection(BANNERS_COLLECTION).doc(banner.id));
  const snapshots = await Promise.all(documentRefs.map((ref) => ref.get()));
  const sourceBytes = snapshots.map((snapshot, index) => assertBannerRecord(snapshot, expectedBanners[index]));

  console.log(`Verified ${expectedBanners.length} exact banner records in Firebase project ${projectId}.`);
  console.table(expectedBanners.map((banner) => ({
    id: banner.id,
    title: banner.title,
    bytes: banner.byteLength,
    sha256: banner.sha256,
  })));

  if (!apply) {
    console.log("Dry run only. No Storage objects or Firestore documents were changed. Re-run with --apply to upload and update the image fields.");
    return;
  }

  const replacements = await Promise.all(expectedBanners.map(async (banner, index) => {
    const downloadToken = randomUUID();
    const objectPath = `banners/migrated-data-uri/${banner.id}_${banner.sha256}_${randomUUID()}.jpg`;
    const object = bucket.file(objectPath);
    await object.save(sourceBytes[index], {
      resumable: false,
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000, immutable",
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });

    const downloadUrl = createStorageDownloadUrl(bucketName, objectPath, downloadToken);
    const response = await fetch(downloadUrl);
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/jpeg")) {
      throw new Error(`Storage verification failed for ${banner.title} (${banner.id}); Firestore remains unchanged.`);
    }
    const downloadedBytes = Buffer.from(await response.arrayBuffer());
    const downloadedHash = createHash("sha256").update(downloadedBytes).digest("hex").toUpperCase();
    if (downloadedBytes.length !== banner.byteLength || downloadedHash !== banner.sha256) {
      throw new Error(`Uploaded bytes did not verify for ${banner.title} (${banner.id}); Firestore remains unchanged.`);
    }

    return { banner, documentRef: documentRefs[index], downloadUrl };
  }));

  const readline = createInterface({ input: stdin, output: stdout });
  const confirmation = await readline.question(
    `All ${replacements.length} Storage URLs return the exact verified JPEG bytes. Type UPDATE 4 MEROPASAL BANNERS to replace only their Firestore image fields: `,
  );
  readline.close();
  if (confirmation !== "UPDATE 4 MEROPASAL BANNERS") {
    console.log("No Firestore fields were changed. Verified Storage objects were retained; original banner fields remain intact.");
    return;
  }

  await firestore.runTransaction(async (transaction) => {
    const currentSnapshots = await Promise.all(replacements.map(({ documentRef }) => transaction.get(documentRef)));
    currentSnapshots.forEach((snapshot, index) => {
      assertBannerRecord(snapshot, replacements[index].banner);
    });
    for (const replacement of replacements) {
      transaction.update(replacement.documentRef, { image: replacement.downloadUrl });
    }
  });

  const updatedSnapshots = await Promise.all(replacements.map(({ documentRef }) => documentRef.get()));
  updatedSnapshots.forEach((snapshot, index) => {
    if (snapshot.data()?.image !== replacements[index].downloadUrl) {
      throw new Error(`Post-update verification failed for ${replacements[index].banner.title} (${replacements[index].banner.id}).`);
    }
  });
  console.log("Updated only the four existing banner image fields. Original Storage objects and all other Firestore fields were left untouched.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Banner migration failed.");
  process.exitCode = 1;
});
