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

initializeFirebase();

const adminAuth = getAuth();
const adminDb = getFirestore();

function slugifyName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildUserId(role, uid) {
  const prefixes = {
    regionaladmin: "ADMIN",
    doctor: "DOCTOR",
    midwife: "MIDWIFE",
    mother: "MOTHER",
  };

  return `${prefixes[role]}-${uid.slice(0, 6).toUpperCase()}`;
}

function buildUsername(fullName, role, index) {
  const suffixes = {
    regionaladmin: "admin",
    doctor: "doctor",
    midwife: "midwife",
    mother: "mother",
  };

  return `${slugifyName(fullName)}.${suffixes[role]}${String(index).padStart(2, "0")}`;
}

function buildSystemEmail(fullName, role, index) {
  return `${buildUsername(fullName, role, index)}@mamabalance.lk`;
}

function buildTemporaryPassword(fullName, role) {
  const firstName = capitalize(
    (fullName.trim().split(/\s+/)[0] || "User").replace(/[^A-Za-z0-9]/g, ""),
  );

  const roleLabel = {
    regionaladmin: "Admin",
    doctor: "Doctor",
    midwife: "Midwife",
    mother: "Mother",
  }[role];

  return `${firstName}${roleLabel}@123`;
}

function buildNic(index) {
  return `19990${String(100000 + index).slice(-6)}V`;
}

function buildPhone(index) {
  return `+9477${String(1000000 + index).slice(-7)}`;
}

const REGIONS = [
  { id: "RG001", name: "Kaduwela" },
  { id: "RG002", name: "Homagama" },
  { id: "RG003", name: "Maharagama" },
  { id: "RG004", name: "Kesbewa" },
  { id: "RG005", name: "Moratuwa" },
];

const regionalAdmins = [
  { fullName: "Uma Perera", personalEmail: "umaperera1230@gmail.com", regionId: "RG001" },
  { fullName: "Dilani Fernando", personalEmail: "regionaladmin02@example.com", regionId: "RG002" },
  { fullName: "Nadeeka Silva", personalEmail: "regionaladmin03@example.com", regionId: "RG003" },
  { fullName: "Kanishka Jayasuriya", personalEmail: "regionaladmin04@example.com", regionId: "RG004" },
  { fullName: "Hasini Peris", personalEmail: "regionaladmin05@example.com", regionId: "RG005" },
];

const doctors = [
  { fullName: "Iresha Tharangani", personalEmail: "ireshatharangani11@gmail.com", regionId: "RG001" },
  { fullName: "Kasuni Wickramasinghe", personalEmail: "doctor02@example.com", regionId: "RG001" },
  { fullName: "Chathura Perera", personalEmail: "doctor03@example.com", regionId: "RG002" },
  { fullName: "Malsha Fernando", personalEmail: "doctor04@example.com", regionId: "RG003" },
  { fullName: "Dinithi Silva", personalEmail: "doctor05@example.com", regionId: "RG004" },
  { fullName: "Harshani Jayawardena", personalEmail: "doctor06@example.com", regionId: "RG005" },
];

const midwives = [
  { fullName: "Bindya Umayangani", personalEmail: "bindyaumayangani2005@gmail.com", regionId: "RG001" },
  { fullName: "Sachini Perera", personalEmail: "midwife02@example.com", regionId: "RG001" },
  { fullName: "Nethmi Silva", personalEmail: "midwife03@example.com", regionId: "RG002" },
  { fullName: "Dilki Fernando", personalEmail: "midwife04@example.com", regionId: "RG003" },
  { fullName: "Sewwandi Perera", personalEmail: "midwife05@example.com", regionId: "RG003" },
  { fullName: "Amaya Jayasinghe", personalEmail: "midwife06@example.com", regionId: "RG004" },
  { fullName: "Rashmi Fernando", personalEmail: "midwife07@example.com", regionId: "RG005" },
];

const mothers = [
  { fullName: "Dusantha Sampath", personalEmail: "dusanthasampath14@gmail.com", regionId: "RG001", birthdate: "1996-03-14", deliveryDate: "2026-08-12", address: "123 Lake Road, Kaduwela" },
  { fullName: "Nimali Perera", personalEmail: "mother02@example.com", regionId: "RG001", birthdate: "1998-07-21", deliveryDate: "2026-09-05", address: "57 Temple Road, Kaduwela" },
  { fullName: "Suhani Silva", personalEmail: "mother03@example.com", regionId: "RG001", birthdate: "1994-12-09", deliveryDate: "2026-10-10", address: "89 Colombo Road, Kaduwela" },
  { fullName: "Tharushi Fernando", personalEmail: "mother04@example.com", regionId: "RG002", birthdate: "1997-05-30", deliveryDate: "2026-07-18", address: "42 Main Street, Homagama" },
  { fullName: "Ashani Karunarathne", personalEmail: "mother05@example.com", regionId: "RG002", birthdate: "1995-11-17", deliveryDate: "2026-08-20", address: "12 School Lane, Homagama" },
  { fullName: "Dinusha Perera", personalEmail: "mother06@example.com", regionId: "RG003", birthdate: "1993-09-02", deliveryDate: "2026-07-28", address: "65 Temple Road, Maharagama" },
  { fullName: "Madhavi Silva", personalEmail: "mother07@example.com", regionId: "RG003", birthdate: "1999-01-11", deliveryDate: "2026-11-14", address: "27 Station Road, Maharagama" },
  { fullName: "Rashika Fernando", personalEmail: "mother08@example.com", regionId: "RG003", birthdate: "1996-06-24", deliveryDate: "2026-12-03", address: "77 Hospital Lane, Maharagama" },
  { fullName: "Dilani Perera", personalEmail: "mother09@example.com", regionId: "RG004", birthdate: "1994-02-19", deliveryDate: "2026-09-11", address: "31 Old Kesbewa Road, Kesbewa" },
  { fullName: "Nisansala Silva", personalEmail: "mother10@example.com", regionId: "RG004", birthdate: "1998-04-16", deliveryDate: "2026-10-21", address: "144 Market Street, Kesbewa" },
  { fullName: "Chamodi Fernando", personalEmail: "mother11@example.com", regionId: "RG005", birthdate: "1995-08-05", deliveryDate: "2026-07-25", address: "8 Beach Road, Moratuwa" },
  { fullName: "Piumi Jayasinghe", personalEmail: "mother12@example.com", regionId: "RG005", birthdate: "1997-10-12", deliveryDate: "2026-11-09", address: "54 Galle Road, Moratuwa" },
];

async function ensureRegion(region) {
  await adminDb.collection("regions").doc(region.id).set(
    {
      id: region.id,
      name: region.name,
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

async function upsertAuthUser({ loginEmail, password, fullName, phoneNumber }) {
  try {
    const existing = await adminAuth.getUserByEmail(loginEmail);
    const updated = await adminAuth.updateUser(existing.uid, {
      email: loginEmail,
      password,
      displayName: fullName,
      ...(phoneNumber ? { phoneNumber } : {}),
    });
    return updated;
  } catch (error) {
    if (error && error.code === "auth/user-not-found") {
      return adminAuth.createUser({
        email: loginEmail,
        password,
        displayName: fullName,
        ...(phoneNumber ? { phoneNumber } : {}),
      });
    }

    throw error;
  }
}

async function createStaff(entry, role, index) {
  const loginEmail = buildSystemEmail(entry.fullName, role, index);
  const temporaryPassword = buildTemporaryPassword(entry.fullName, role);
  const username = buildUsername(entry.fullName, role, index);
  const phoneNumber = buildPhone(index);
  const nic = buildNic(index);
  const authUser = await upsertAuthUser({
    loginEmail,
    password: temporaryPassword,
    fullName: entry.fullName,
  });
  const userId = buildUserId(role, authUser.uid);

  await adminDb.collection("users").doc(authUser.uid).set({
    uid: authUser.uid,
    userId,
    role,
    status: "active",
    displayName: entry.fullName,
    username,
    email: loginEmail,
    personalEmail: entry.personalEmail.toLowerCase(),
    phoneNumber,
    nic,
    regionId: entry.regionId,
    clinicId: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdByUid: null,
  }, { merge: true });

  return {
    uid: authUser.uid,
    userId,
    fullName: entry.fullName,
    role,
    regionId: entry.regionId,
    loginEmail,
    temporaryPassword,
    personalEmail: entry.personalEmail.toLowerCase(),
    username,
  };
}

async function createMother(entry, index, doctorUid, midwifeUid) {
  const role = "mother";
  const loginEmail = buildSystemEmail(entry.fullName, role, index);
  const temporaryPassword = buildTemporaryPassword(entry.fullName, role);
  const username = buildUsername(entry.fullName, role, index);
  const phoneNumber = buildPhone(100 + index);
  const nic = buildNic(100 + index);
  const authUser = await upsertAuthUser({
    loginEmail,
    password: temporaryPassword,
    fullName: entry.fullName,
    phoneNumber,
  });
  const userId = buildUserId(role, authUser.uid);

  await adminDb.collection("users").doc(authUser.uid).set({
    uid: authUser.uid,
    userId,
    motherId: authUser.uid,
    role,
    status: "active",
    displayName: entry.fullName,
    username,
    email: loginEmail,
    personalEmail: entry.personalEmail.toLowerCase(),
    phoneNumber,
    nic,
    regionId: entry.regionId,
    clinicId: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdByUid: null,
  }, { merge: true });

  await adminDb.collection("mothers").doc(authUser.uid).set({
    motherId: authUser.uid,
    userUid: authUser.uid,
    userId,
    fullName: entry.fullName,
    nic,
    email: loginEmail,
    personalEmail: entry.personalEmail.toLowerCase(),
    username,
    phoneNumber,
    address: entry.address,
    birthdate: entry.birthdate,
    guardianName: `${entry.fullName.split(" ")[0]} Guardian`,
    guardianContact: buildPhone(200 + index),
    deliveryDate: entry.deliveryDate,
    noOfChildren: (index % 3) + 1,
    regionId: entry.regionId,
    clinicId: null,
    assignedDoctorUid: doctorUid,
    assignedMidwifeUid: midwifeUid,
    riskLevel: "low",
    latestEpdsScore: 0,
    isHighRisk: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return {
    uid: authUser.uid,
    userId,
    fullName: entry.fullName,
    role,
    regionId: entry.regionId,
    loginEmail,
    temporaryPassword,
    personalEmail: entry.personalEmail.toLowerCase(),
    username,
    phoneNumber,
  };
}

async function main() {
  for (const region of REGIONS) {
    await ensureRegion(region);
  }

  const createdRegionalAdmins = [];
  for (const [index, entry] of regionalAdmins.entries()) {
    createdRegionalAdmins.push(
      await createStaff(entry, "regionaladmin", index + 1),
    );
  }

  const createdDoctors = [];
  for (const [index, entry] of doctors.entries()) {
    createdDoctors.push(await createStaff(entry, "doctor", index + 1));
  }

  const createdMidwives = [];
  for (const [index, entry] of midwives.entries()) {
    createdMidwives.push(await createStaff(entry, "midwife", index + 1));
  }

  const doctorByRegion = new Map();
  for (const doctor of createdDoctors) {
    if (!doctorByRegion.has(doctor.regionId)) {
      doctorByRegion.set(doctor.regionId, doctor.uid);
    }
  }

  const midwifeByRegion = new Map();
  for (const midwife of createdMidwives) {
    if (!midwifeByRegion.has(midwife.regionId)) {
      midwifeByRegion.set(midwife.regionId, midwife.uid);
    }
  }

  const createdMothers = [];
  for (const [index, entry] of mothers.entries()) {
    const doctorUid = doctorByRegion.get(entry.regionId);
    const midwifeUid = midwifeByRegion.get(entry.regionId);

    if (!doctorUid || !midwifeUid) {
      throw new Error(`Missing doctor or midwife assignment for region ${entry.regionId}.`);
    }

    createdMothers.push(
      await createMother(entry, index + 1, doctorUid, midwifeUid),
    );
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    regions: REGIONS,
    counts: {
      regionalAdmins: createdRegionalAdmins.length,
      doctors: createdDoctors.length,
      midwives: createdMidwives.length,
      mothers: createdMothers.length,
    },
    credentials: [
      ...createdRegionalAdmins,
      ...createdDoctors,
      ...createdMidwives,
      ...createdMothers,
    ],
  };

  const outputPath = path.resolve(
    __dirname,
    "..",
    "..",
    "firebase",
    "seed-demo-users-output.json",
  );
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));

  console.log("Seed complete.");
  console.log(`Summary written to ${outputPath}`);
  console.log(JSON.stringify(summary.counts, null, 2));
}

main().catch((error) => {
  console.error("Seed failed:");
  console.error(error);
  process.exit(1);
});
