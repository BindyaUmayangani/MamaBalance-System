import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

type RegionRow = {
  id: string;
  name: string;
  doctors: number;
  midwives: number;
  mothers: number;
};

async function getRoleCount(regionId: string, role: string) {
  const snapshot = await adminDb
    .collection("users")
    .where("regionId", "==", regionId)
    .where("role", "==", role)
    .get();

  return snapshot.size;
}

async function buildRegionRows(): Promise<RegionRow[]> {
  const regionsSnapshot = await adminDb
    .collection("regions")
    .orderBy("id")
    .get();

  const rows = await Promise.all(
    regionsSnapshot.docs.map(async (doc) => {
      const data = doc.data();

      const id = data.id || doc.id;
      const name = data.name || "";

      const [doctors, midwives, mothers] = await Promise.all([
        getRoleCount(id, "doctor"),
        getRoleCount(id, "midwife"),
        getRoleCount(id, "mother"),
      ]);

      return {
        id,
        name,
        doctors,
        midwives,
        mothers,
      };
    })
  );

  return rows;
}

function getNextRegionId(existingIds: string[]) {
  const maxNumber = existingIds.reduce((max, id) => {
    const number = Number(id.replace("RG", ""));
    return Number.isNaN(number) ? max : Math.max(max, number);
  }, 0);

  return `RG${String(maxNumber + 1).padStart(3, "0")}`;
}

export async function GET() {
  try {
    const rows = await buildRegionRows();
    return NextResponse.json({ regions: rows });
  } catch (error) {
    console.error("GET /api/admin/regions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch regions." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Region name is required." },
        { status: 400 }
      );
    }

    const existingSnapshot = await adminDb.collection("regions").get();

    const duplicate = existingSnapshot.docs.find((doc) => {
      const data = doc.data();
      return String(data.name || "").toLowerCase() === name.toLowerCase();
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Region already exists." },
        { status: 400 }
      );
    }

    const existingIds = existingSnapshot.docs.map(
      (doc) => String(doc.data().id || doc.id)
    );

    const newId = getNextRegionId(existingIds);

    await adminDb.collection("regions").doc(newId).set({
      id: newId,
      name,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      region: {
        id: newId,
        name,
        doctors: 0,
        midwives: 0,
        mothers: 0,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/regions error:", error);
    return NextResponse.json(
      { error: "Failed to add region." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const regionId = String(body.id || "").trim();

    if (!regionId) {
      return NextResponse.json(
        { error: "Region ID is required." },
        { status: 400 }
      );
    }

    const [doctorCount, midwifeCount, motherCount] = await Promise.all([
      getRoleCount(regionId, "doctor"),
      getRoleCount(regionId, "midwife"),
      getRoleCount(regionId, "mother"),
    ]);

    if (doctorCount > 0 || midwifeCount > 0 || motherCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete region because users are still assigned to it.",
        },
        { status: 400 }
      );
    }

    await adminDb.collection("regions").doc(regionId).delete();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/regions error:", error);
    return NextResponse.json(
      { error: "Failed to delete region." },
      { status: 500 }
    );
  }
}