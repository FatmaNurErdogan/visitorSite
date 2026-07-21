"use client";

// /login adresinde açılır. Personel (resepsiyon/employee/admin) buradan
// email + şifre ile giriş yapıyor. Ziyaretçiler bu sayfayı hiç görmeyecek,
// onlar kendi linkinden (/visit/[token]) giriyor.
import { useActionState } from "react";
import { loginAction } from "@/actions/login";

export default function LoginPage() {
  const [errorMessage, formAction, isPending] = useActionState(loginAction, undefined);

  return (
    <main className="page-container">
      <h1>Login</h1>
      <form action={formAction}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input className="form-input" id="email" name="email" type="email" required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="password">
            Password
          </label>
          <input className="form-input" id="password" name="password" type="password" required />
        </div>
        {errorMessage && <p>{errorMessage}</p>}
        <button className="btn btn-primary" type="submit" disabled={isPending}>
          {isPending ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
