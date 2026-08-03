import { Prisma } from "@prisma/client";

// Prisma'nın "update where" koşulu (id + belirli bir status) eşleşen satır
// bulamazsa fırlattığı hata. Bu genelde iki kişi/iki sekme aynı ziyareti
// aynı anda işlemeye çalıştığında olur — durum zaten değişmiş demektir.
export function isRecordNotFoundError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
