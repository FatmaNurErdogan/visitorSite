import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Ziyaretçinin "kimi ziyaret ediyorsunuz" listesinde seçtiği personel listesi.
// Auth gerektirmez — visitor/page.tsx'teki sorguyla aynı.
export async function GET() {
  const hosts = await prisma.staff.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ hosts });
}
