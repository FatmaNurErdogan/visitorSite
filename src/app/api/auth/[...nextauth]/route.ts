// next-auth'un giriş/çıkış isteklerini karşıladığı adres. İçini biz doldurmuyoruz,
// az önce src/auth.ts'de kurduğumuz ayarları burada dışa açıyoruz.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
