// Fills the local SQLite test DB (prisma/schema.sqlite.prisma) with a
// small, representative set of sample rows — one of each role/status the
// app actually branches on — so it's immediately useful for manual
// testing without needing to click through the whole app to create data.
// Plain JS (not TS) so it runs with plain `node`, no extra dependency.
//
// Run: npm run db:test:seed  (wipes and re-seeds; safe to re-run)

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("../node_modules/.prisma/client-test");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();

async function main() {
  // Wipe in FK-safe order.
  await prisma.message.deleteMany();
  await prisma.roomBooking.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.meetingRoom.deleteMany();
  await prisma.department.deleteMany();
  await prisma.staff.deleteMany();

  const passwordHash = await bcrypt.hash("test1234", 10);

  const [admin, employee, receptionist] = await Promise.all([
    prisma.staff.create({
      data: { name: "Ayşe Yılmaz", email: "admin@test.local", passwordHash, role: "ADMIN" },
    }),
    prisma.staff.create({
      data: { name: "Mehmet Demir", email: "employee@test.local", passwordHash, role: "EMPLOYEE", department: "Mühendislik" },
    }),
    prisma.staff.create({
      data: { name: "Zeynep Kaya", email: "reception@test.local", passwordHash, role: "RECEPTIONIST" },
    }),
  ]);

  await prisma.department.create({ data: { name: "Mühendislik" } });

  const room = await prisma.meetingRoom.create({
    data: { name: "Toplantı Odası 1", location: "2. kat", capacity: 6, perks: "Projeksiyon, Beyaz tahta" },
  });

  const visitor = await prisma.visitor.create({
    data: { name: "Test Ziyaretçi", phone: "5551234567", email: "visitor@test.local", company: "Örnek A.Ş." },
  });

  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const in90Min = new Date(now.getTime() + 90 * 60 * 1000);

  // One visit per status branch the UI/actions actually check.
  await prisma.visit.create({
    data: {
      visitorId: visitor.id,
      hostEmployeeId: employee.id,
      visitReason: "Proje görüşmesi",
      scheduledAt: inOneHour,
      scheduledEndAt: in90Min,
      status: "PENDING",
      accessToken: randomUUID(),
      tokenExpiresAt: new Date(in90Min.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.visit.create({
    data: {
      visitorId: visitor.id,
      hostEmployeeId: employee.id,
      visitReason: "Sözleşme imzası",
      scheduledAt: inOneHour,
      scheduledEndAt: in90Min,
      status: "PENDING_ADMIN_APPROVAL",
      respondedAt: now,
      accessToken: randomUUID(),
      tokenExpiresAt: new Date(in90Min.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.visit.create({
    data: {
      visitorId: visitor.id,
      hostEmployeeId: employee.id,
      visitReason: "Bugünkü ziyaret",
      scheduledAt: now,
      scheduledEndAt: inOneHour,
      status: "ACCEPTED",
      respondedAt: now,
      accessToken: randomUUID(),
      tokenExpiresAt: new Date(inOneHour.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seeded prisma/test.db:");
  console.log(`  admin@test.local / employee@test.local / reception@test.local — password: test1234`);
  console.log(`  1 room, 1 visitor, 3 visits (PENDING / PENDING_ADMIN_APPROVAL / ACCEPTED)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
