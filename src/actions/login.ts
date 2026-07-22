"use server";

// Login formu gönderilince çalışan fonksiyon. Girilen email/şifreyi
// next-auth'a (src/auth.ts) verip kontrol ettiriyoruz.
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(_prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      expectedRole: formData.get("expectedRole"),
      redirectTo: "/staff/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password, or this account doesn't have access from this login.";
    }
    throw error;
  }
}
