"use client";

import { useActionState } from "react";
import { createMeetingRoom } from "@/actions/rooms";

export function MeetingRoomForm() {
  const [state, formAction, isPending] = useActionState(createMeetingRoom, undefined);

  return (
    <form action={formAction} className="card">
      <h2>Toplantı odası ekle</h2>
      <div className="form-group">
        <label className="form-label" htmlFor="name">
          Ad
        </label>
        <input className="form-input" id="name" name="name" type="text" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="location">
          Konum (opsiyonel)
        </label>
        <input className="form-input" id="location" name="location" type="text" />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="capacity">
          Kapasite (opsiyonel)
        </label>
        <input className="form-input" id="capacity" name="capacity" type="number" min={1} step={1} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="perks">
          Özellikler (opsiyonel)
        </label>
        <input
          className="form-input"
          id="perks"
          name="perks"
          type="text"
          placeholder="Projeksiyon, Beyaz tahta, TV"
        />
      </div>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p>Oda eklendi.</p>}
      <button className="btn btn-primary" type="submit" disabled={isPending}>
        {isPending ? "Ekleniyor..." : "Oda ekle"}
      </button>
    </form>
  );
}
