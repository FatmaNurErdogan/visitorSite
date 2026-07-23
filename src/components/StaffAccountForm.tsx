"use client";

import { useActionState } from "react";
import { createStaffAccount } from "@/actions/staff";

export function StaffAccountForm() {
  const [state, formAction, isPending] = useActionState(createStaffAccount, undefined);

  return (
    <form action={formAction} className="card">
      <h2>Add a staff account</h2>
      <div className="form-group">
        <label className="form-label" htmlFor="name">
          Name
        </label>
        <input className="form-input" id="name" name="name" type="text" required />
      </div>
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
        <input className="form-input" id="password" name="password" type="password" required minLength={6} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="role">
          Role
        </label>
        <select className="form-input" id="role" name="role" required defaultValue="EMPLOYEE">
          <option value="EMPLOYEE">Employee</option>
          <option value="RECEPTIONIST">Receptionist</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p>Account created.</p>}
      <button className="btn btn-primary" type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create account"}
      </button>
    </form>
  );
}
