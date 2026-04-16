const fs = require("fs");
const path = require("path");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

function loadEnvFile(envPath) {
  const env = {};

  if (!fs.existsSync(envPath)) {
    return env;
  }

  const content = fs.readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value.replace(/\\n/g, "\n");
  }

  return env;
}

function envValue(key, localEnv) {
  return process.env[key] || localEnv[key] || "";
}

function initializeFirebase() {
  if (getApps().length > 0) {
    return;
  }

  const root = path.resolve(__dirname, "..");
  const localEnv = loadEnvFile(path.join(root, ".env.local"));

  const projectId = envValue("FIREBASE_ADMIN_PROJECT_ID", localEnv);
  const clientEmail = envValue("FIREBASE_ADMIN_CLIENT_EMAIL", localEnv);
  const privateKey = envValue("FIREBASE_ADMIN_PRIVATE_KEY", localEnv);
  const storageBucket = envValue("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", localEnv);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Please check mamabalance-web/.env.local.",
    );
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    ...(storageBucket ? { storageBucket } : {}),
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhoneNumber(value) {
  const cleaned = String(value || "").trim().replace(/[\s()-]/g, "");

  if (!cleaned) {
    return "";
  }

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("94")) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith("0")) {
    return `+94${cleaned.slice(1)}`;
  }

  return cleaned;
}

initializeFirebase();

const adminAuth = getAuth();
const adminDb = getFirestore();

async function syncMotherAuthIdentities() {
  const snapshot = await adminDb.collection("users").where("role", "==", "mother").get();

  let updated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const personalEmail = normalizeEmail(data.personalEmail || data.email);
    const phoneNumber = normalizePhoneNumber(data.phoneNumber);

    if (!personalEmail) {
      skipped += 1;
      continue;
    }

    await adminAuth.updateUser(doc.id, {
      email: personalEmail,
      ...(phoneNumber ? { phoneNumber } : {}),
    });

    const batch = adminDb.batch();
    batch.update(doc.ref, {
      email: personalEmail,
      personalEmail,
      ...(phoneNumber ? { phoneNumber } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(adminDb.collection("mothers").doc(doc.id), {
      email: personalEmail,
      personalEmail,
      ...(phoneNumber ? { phoneNumber } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    updated += 1;
    console.log(`Synced mother ${doc.id} -> ${personalEmail}`);
  }

  console.log(`Done. Updated: ${updated}. Skipped: ${skipped}.`);
}

syncMotherAuthIdentities().catch((error) => {
  console.error(error);
  process.exit(1);
});
