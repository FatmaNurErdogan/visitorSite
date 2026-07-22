"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/actions/login";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(loginAction, undefined);
  const searchParams = useSearchParams();
  const as = searchParams.get("as"); // "employee" | "receptionist" | null

  const heading =
    as === "employee" ? "Employee Login" : as === "receptionist" ? "Receptionist Login" : "Login";

  return (
    <main className="page-container">
      <h1>{heading}</h1>
      <form action={formAction}>
        <input type="hidden" name="expectedRole" value={as ?? ""} />
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
        {errorMessage && <p className="form-error">{errorMessage}</p>}
        <button className="btn btn-primary" type="submit" disabled={isPending}>
          {isPending ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
