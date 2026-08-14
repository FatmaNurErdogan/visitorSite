"use client";

import { useActionState } from "react";
import { createDepartment } from "@/actions/departments";

export function DepartmentForm() {
  const [state, formAction, isPending] = useActionState(createDepartment, undefined);

  return (
    <form action={formAction} className="card">
      <h2>Departman ekle</h2>
      <div className="form-group">
        <label className="form-label" htmlFor="name">
          Ad
        </label>
        <input className="form-input" id="name" name="name" type="text" required />
      </div>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p>Departman eklendi.</p>}
      <button className="btn btn-primary" type="submit" disabled={isPending}>
        {isPending ? "Ekleniyor..." : "Departman ekle"}
      </button>
    </form>
  );
}
