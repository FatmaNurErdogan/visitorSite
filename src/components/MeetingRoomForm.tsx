"use client";

import { useActionState } from "react";
import { createMeetingRoom } from "@/actions/rooms";

export function MeetingRoomForm() {
  const [state, formAction, isPending] = useActionState(createMeetingRoom, undefined);

  return (
    <form action={formAction} className="card">
      <h2>Add a meeting room</h2>
      <div className="form-group">
        <label className="form-label" htmlFor="name">
          Name
        </label>
        <input className="form-input" id="name" name="name" type="text" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="location">
          Location (optional)
        </label>
        <input className="form-input" id="location" name="location" type="text" />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="capacity">
          Capacity (optional)
        </label>
        <input className="form-input" id="capacity" name="capacity" type="number" min={1} step={1} />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="perks">
          Perks (optional)
        </label>
        <input
          className="form-input"
          id="perks"
          name="perks"
          type="text"
          placeholder="Projector, Whiteboard, TV"
        />
      </div>
      {state?.error && <p className="form-error">{state.error}</p>}
      {state?.success && <p>Room added.</p>}
      <button className="btn btn-primary" type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add room"}
      </button>
    </form>
  );
}
