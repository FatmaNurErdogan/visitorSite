import { Prisma } from "@prisma/client";

// Prisma'nın "update where" koşulu (id + belirli bir status) eşleşen satır
// bulamazsa fırlattığı hata. Bu genelde iki kişi/iki sekme aynı ziyareti
// aynı anda işlemeye çalıştığında olur — durum zaten değişmiş demektir.
export function isRecordNotFoundError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

// SERIALIZABLE izolasyonlu bir $transaction, SQL Server iki eşzamanlı
// transaction'ın kilit/aralık çakışmasını tespit ettiğinde P2034 ("write
// conflict or deadlock") fırlatabilir — bu, verinin bozulduğu anlamına
// gelmez, sadece bu transaction'ın kaybeden taraf seçildiği anlamına gelir.
// Prisma bunu açıkça retry edilebilir olarak dokümante eder:
// https://www.prisma.io/docs/orm/reference/error-reference#p2034
export function isTransactionConflictError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

// Bir SERIALIZABLE $transaction callback'ini çalıştırır; P2034 alırsa
// (gerçek bir veri hatası değil, sadece kilit çakışması) birkaç kez daha
// dener. roomHasConflict/hostHasRangeConflict gibi check-then-act
// deseninin, yük altında kullanıcıya çıplak 500 yerine ya doğru sonucu ya
// da anlamlı bir hata döndürmesi için kullanılır.
export async function runSerializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  const { prisma } = await import("@/lib/prisma");
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      lastError = error;
      if (!isTransactionConflictError(error) || attempt === maxAttempts) {
        throw error;
      }
    }
  }
  throw lastError;
}
