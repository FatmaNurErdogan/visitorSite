// Bu dosya her istekten önce çalışır. Görevi basit: giriş yapmamış biri
// /staff/... altındaki bir sayfaya gitmeye çalışırsa, onu /login'e yönlendirir.
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isStaffPage = req.nextUrl.pathname.startsWith("/staff");
  if (isStaffPage && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: ["/staff/:path*"],
};
