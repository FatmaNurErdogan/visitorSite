"use client";

import { useActionState } from "react";
import { submitVisitApproval } from "@/actions/rooms";

type RoomOption = {
  id: string;
  name: string;
};

function defaultEndTime(scheduledAt: string) {
  const end = new Date(scheduledAt);
  end.setHours(end.getHours() + 1);
  end.setMinutes(end.getMinutes() - end.getTimezoneOffset());
  return end.toISOString().slice(0, 16);
}

export function ApproveVisitForm({
  visitId,
  rooms,
  scheduledAt,
  requiresApproval,
}: {
  visitId: string;
  rooms: RoomOption[];
  scheduledAt: string; // ISO
  // false ise (ADMIN) onay anında verilir; true ise (EMPLOYEE host) admin'e
  // gönderilen bir talep oluşturulur.
  requiresApproval: boolean;
}) {
  const [state, formAction, isPending] = useActionState(submitVisitApproval.bind(null, visitId), undefined);

  if (state?.success) {
    return (
      <div className="card">
        <p>
          {requiresApproval
            ? "Room request sent — the visit will be accepted once an admin approves it."
            : "Visit accepted and room booked."}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <div className="form-group">
        <label className="form-label" htmlFor="roomId">
          Meeting room
        </label>
        <select className="form-input" id="roomId" name="roomId" required defaultValue="">
          <option value="" disabled>
            Select a room
          </option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="endTime">
          Meeting ends at
        </label>
        <input
          className="form-input"
          id="endTime"
          name="endTime"
          type="datetime-local"
          min={scheduledAt.slice(0, 16)}
          defaultValue={defaultEndTime(scheduledAt)}
          required
        />
      </div>
      {state?.error && <p className="form-error">{state.error}</p>}
      <button className="btn btn-success" type="submit" disabled={isPending}>
        {isPending ? "Submitting..." : requiresApproval ? "Send room request" : "Approve"}
      </button>
    </form>
  );
}
