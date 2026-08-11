// /login — staff (employee/receptionist/admin) sign in here with email + password.
// Visitors never see this page, they use the public /visitor form instead.
// The `as` query param (?as=employee or ?as=receptionist) records which door
// they came through, so we can block employee accounts from the receptionist
// entrance and vice versa (checked in src/lib/verifyStaffCredentials.ts).
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
