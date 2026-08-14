"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, DoorOpen, Building2, Users, LogOut } from "lucide-react";
import { logoutAction } from "@/actions/logout";
import { ROLE_LABELS } from "@/lib/roleLabels";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  hiddenForRoles?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/staff/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/staff/visits", label: "Ziyaretler", icon: ClipboardList },
  { href: "/staff/rooms", label: "Odalar", icon: DoorOpen, hiddenForRoles: ["RECEPTIONIST"] },
  { href: "/staff/departments", label: "Departmanlar", icon: Building2, adminOnly: true },
  { href: "/staff/staff-users", label: "Personel hesapları", icon: Users, adminOnly: true },
];

export function StaffNav({ role, name }: { role?: string; name?: string }) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN";

  return (
    <nav className="staff-nav">
      <div className="staff-nav-brand">
        <span className="staff-nav-logo">F</span>
        <span>Foyer</span>
      </div>

      <div className="staff-nav-links">
        {NAV_ITEMS.filter((item) => (!item.adminOnly || isAdmin) && !item.hiddenForRoles?.includes(role ?? "")).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`staff-nav-link${active ? " staff-nav-link-active" : ""}`}>
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="staff-nav-footer">
        <div className="staff-nav-user">
          <span className="staff-nav-user-name">{name ?? "Personel"}</span>
          {role && <span className="staff-nav-user-role">{ROLE_LABELS[role] ?? role}</span>}
        </div>
        <form action={logoutAction}>
          <button type="submit" className="staff-nav-logout">
            <LogOut size={16} strokeWidth={2} />
            <span>Çıkış yap</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
