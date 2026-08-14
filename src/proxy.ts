// Bu dosya her istekten önce çalışır. Görevi iki şey:
// 1. Giriş yapmamış biri /staff/... altındaki bir sayfaya gitmeye çalışırsa,
//    onu /login'e yönlendirir.
// 2. Her /staff/... yanıtına "no-store" cache header'ı ekler. Bu olmadan,
//    tarayıcının geri/ileri (bfcache) önbelleği — ör. bir edge-swipe
//    gesture'ı — bu middleware'i (dolayısıyla auth kontrolünü) hiç
//    çalıştırmadan, önceki bir oturumdan kalma authenticated bir sayfayı
//    doğrudan önbellekten gösterebilir.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isStaffPage = req.nextUrl.pathname.startsWith("/staff");

  if (isStaffPage && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  const response = NextResponse.next();
  if (isStaffPage) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  }
  return response;
});

export const config = {
  matcher: ["/staff/:path*"],
};
