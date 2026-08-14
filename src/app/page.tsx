// Home page — a landing screen with 3 entry points depending on who's
// looking at it. Visitor goes to the public request form; Employee and
// Receptionist go to the same login page but with a different `as` query
// param, so an employee account can't log in through the receptionist
// door and vice versa (enforced in src/lib/verifyStaffCredentials.ts).
import Link from "next/link";
import { UserRound, Briefcase, ClipboardCheck } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

export default function Home() {
  return (
    <AuthShell>
      <h1>Hoş geldiniz</h1>
      <p>Lütfen kim olduğunuzu seçin:</p>

      <div className="role-grid">
        <div className="card role-card">
          <div className="role-card-icon">
            <UserRound size={22} strokeWidth={2} />
          </div>
          <h2>Ziyaretçi</h2>
          <p>Çalışanlarımızdan birini ziyaret etmek için talep oluşturun.</p>
          <Link className="btn btn-primary" href="/visitor">
            Ziyaretçiyim
          </Link>
        </div>

        <div className="card role-card">
          <div className="role-card-icon">
            <Briefcase size={22} strokeWidth={2} />
          </div>
          <h2>Çalışan</h2>
          <p>Ziyaret taleplerini onaylamak veya reddetmek için giriş yapın.</p>
          <Link className="btn btn-primary" href="/login?as=employee">
            Çalışanım
          </Link>
        </div>

        <div className="card role-card">
          <div className="role-card-icon">
            <ClipboardCheck size={22} strokeWidth={2} />
          </div>
          <h2>Resepsiyonist</h2>
          <p>Ziyaretçi giriş/çıkışlarını onaylamak için giriş yapın.</p>
          <Link className="btn btn-primary" href="/login?as=receptionist">
            Resepsiyonistim
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
