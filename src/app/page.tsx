// Home page — a landing screen with 3 entry points depending on who's
// looking at it. Visitor goes to the public request form; Employee and
// Receptionist go to the same login page but with a different `as` query
// param, so an employee account can't log in through the receptionist
// door and vice versa (enforced in src/lib/verifyStaffCredentials.ts).
import Link from "next/link";

export default function Home() {
  return (
    <main className="page-container">
      <h1>Visitor Management System</h1>
      <p>Please select who you are:</p>

      <div className="card">
        <h2>Visitor</h2>
        <p>Request a visit to see one of our employees.</p>
        <Link className="btn btn-primary" href="/visitor">
          I&apos;m a Visitor
        </Link>
      </div>

      <div className="card">
        <h2>Employee</h2>
        <p>Log in to approve or reject visit requests.</p>
        <Link className="btn btn-primary" href="/login?as=employee">
          I&apos;m an Employee
        </Link>
      </div>

      <div className="card">
        <h2>Receptionist</h2>
        <p>Log in to check visitors in and out.</p>
        <Link className="btn btn-primary" href="/login?as=receptionist">
          I&apos;m a Receptionist
        </Link>
      </div>
    </main>
  );
}
