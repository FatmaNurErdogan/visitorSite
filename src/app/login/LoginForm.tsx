"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { loginAction } from "@/actions/login";
import { AuthShell } from "@/components/AuthShell";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(loginAction, undefined);
  const searchParams = useSearchParams();
  const as = searchParams.get("as"); // "employee" | "receptionist" | null

  const heading =
    as === "employee" ? "Çalışan Girişi" : as === "receptionist" ? "Resepsiyonist Girişi" : "Giriş";

  return (
    <AuthShell tagline="Ziyaretleri, odaları ve ekibinizi yönetmek için giriş yapın.">
      <h1>{heading}</h1>
      <form action={formAction}>
        <input type="hidden" name="expectedRole" value={as ?? ""} />
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            E-posta
          </label>
          <input className="form-input" id="email" name="email" type="email" required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="password">
            Şifre
          </label>
          <input className="form-input" id="password" name="password" type="password" required />
        </div>
        {errorMessage && <p className="form-error">{errorMessage}</p>}
        <button className="btn btn-primary" type="submit" disabled={isPending}>
          {isPending ? (
            "Giriş yapılıyor..."
          ) : (
            <>
              <LogIn size={15} strokeWidth={2} /> Giriş yap
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
