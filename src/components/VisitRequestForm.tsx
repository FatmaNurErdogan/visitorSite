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
        {state.scheduleConflict ? (
          <p>
            Sorry, your host already has another visit scheduled around that time. We&apos;ve emailed you — please
            submit a new request for a different time.
          </p>
        ) : (
          <p>Thanks! Your visit request has been submitted and is waiting for approval.</p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction}>
      <div className="form-group">
        <label className="form-label" htmlFor="name">
          Your name
        </label>
        <input className="form-input" id="name" name="name" type="text" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="phone">
          Phone
        </label>
        <input className="form-input" id="phone" name="phone" type="tel" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="email">
          Email
        </label>
        <input className="form-input" id="email" name="email" type="email" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="hostEmployeeId">
          Who are you visiting?
        </label>
        <select className="form-input" id="hostEmployeeId" name="hostEmployeeId" required defaultValue="">
          <option value="" disabled>
            Select a host
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
          Reason for visit
        </label>
        <input className="form-input" id="visitReason" name="visitReason" type="text" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="scheduledAt">
          Date and time (9:00–18:00 only)
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
      {state?.error && <p className="form-error">{state.error}</p>}
      <button className="btn btn-primary" type="submit" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit request"}
      </button>
    </form>
  );
}
