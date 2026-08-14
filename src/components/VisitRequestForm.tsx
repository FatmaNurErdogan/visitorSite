"use client";

import { useActionState } from "react";
import { createVisitRequest } from "@/actions/visits";

type HostOption = {
  id: string;
  name: string;
  department?: string | null;
};


function nowForDateTimeInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function VisitRequestForm({ hosts }: { hosts: HostOption[] }) {
  const [state, formAction, isPending] = useActionState(createVisitRequest, undefined);

  if (state?.success) {
    return (
      <div className="card">
        <p>Teşekkürler! Ziyaret talebiniz gönderildi ve onay bekliyor.</p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <div className="form-group">
        <label className="form-label" htmlFor="name">
          Adınız
        </label>
        <input className="form-input" id="name" name="name" type="text" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="phone">
          Telefon
        </label>
        <input className="form-input" id="phone" name="phone" type="tel" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="email">
          E-posta
        </label>
        <input className="form-input" id="email" name="email" type="email" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="hostEmployeeId">
          Kimi ziyaret ediyorsunuz?
        </label>
        <select className="form-input" id="hostEmployeeId" name="hostEmployeeId" required defaultValue="">
          <option value="" disabled>
            Bir host seçin
          </option>
          {hosts.map((host) => (
            <option key={host.id} value={host.id}>
              {host.name}
              {host.department ? ` (${host.department})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="visitReason">
          Ziyaret sebebi
        </label>
        <input className="form-input" id="visitReason" name="visitReason" type="text" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="scheduledAt">
          Başlangıç saati (yalnızca 9:00–18:00 arası)
        </label>
        <input
          className="form-input"
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          min={nowForDateTimeInput()}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="scheduledEndAt">
          Bitiş saati (aynı gün, en geç 18:00)
        </label>
        <input
          className="form-input"
          id="scheduledEndAt"
          name="scheduledEndAt"
          type="datetime-local"
          min={nowForDateTimeInput()}
          required
        />
      </div>
      {state?.error && <p className="form-error">{state.error}</p>}
      <button className="btn btn-primary" type="submit" disabled={isPending}>
        {isPending ? "Gönderiliyor..." : "Talebi gönder"}
      </button>
    </form>
  );
}
