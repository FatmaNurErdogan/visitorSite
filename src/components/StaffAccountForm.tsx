"use client";

import { useActionState } from "react";
import { createStaffAccount } from "@/actions/staff";

export function StaffAccountForm({ departments }: { departments: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(createStaffAccount, undefined);

  return (
    <form action={formAction} className="card">
      <h2>Personel hesabı ekle</h2>
      <div className="form-group">
        <label className="form-label" htmlFor="name">
          Ad
        </label>
        <input className="form-input" id="name" name="name" type="text" required />
      </div>
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
        <input className="form-input" id="password" name="password" type="password" required minLength={6} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="role">
          Rol
        </label>
        <select className="form-input" id="role" name="role" required defaultValue="EMPLOYEE">
          <option value="EMPLOYEE">Çalışan</option>
          <option value="RECEPTIONIST">Resepsiyonist</option>
          <option value="ADMIN">Yönetici</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="department">
          Departman
        </label>
        <select className="form-input" id="department" name="department" defaultValue="">
          <option value="">Departman yok</option>
          {departments.map((department) => (
            <option key={department.id} value={department.name}>
              {department.name}
            </option>
          ))}
        </select>
      </div>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p>Hesap oluşturuldu.</p>}
      <button className="btn btn-primary" type="submit" disabled={isPending}>
        {isPending ? "Oluşturuluyor..." : "Hesap oluştur"}
      </button>
    </form>
  );
}
