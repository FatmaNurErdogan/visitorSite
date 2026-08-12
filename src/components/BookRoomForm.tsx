"use client";

import { useActionState } from "react";
import { bookRoom } from "@/actions/rooms";

function nowForDateTimeInput() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function BookRoomForm({ roomId }: { roomId: string }) {
  const [state, formAction, isPending] = useActionState(bookRoom.bind(null, roomId), undefined);

  if (state?.success) {
    return (
      <div className="card">
        <p>Room booked.</p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <div className="form-group">
        <label className="form-label" htmlFor="purpose">
          Purpose
        </label>
        <input className="form-input" id="purpose" name="purpose" type="text" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="startTime">
          Starts at
        </label>
        <input
          className="form-input"
          id="startTime"
          name="startTime"
          type="datetime-local"
          min={nowForDateTimeInput()}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="endTime">
          Ends at
        </label>
        <input
          className="form-input"
          id="endTime"
          name="endTime"
          type="datetime-local"
          min={nowForDateTimeInput()}
          required
        />
      </div>
      {state?.error && <p className="form-error">{state.error}</p>}
      <button className="btn btn-primary" type="submit" disabled={isPending}>
        {isPending ? "Booking..." : "Book room"}
      </button>
    </form>
  );
}
