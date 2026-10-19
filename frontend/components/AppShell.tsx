"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell, BookOpen, CalendarDays, CircleDollarSign, ClipboardCheck, FileBarChart,
  GraduationCap, LayoutDashboard, Library, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, UserCog, Users, X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { initials, longDate } from "../lib/format";
import { HOME_FOR_ROLE, ROLE_LABEL, canAccess } from "../lib/roles";
import type { Role } from "../lib/types";

const NAV: { label: string; href: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { label: "Schools", href: "/schools", icon: LayoutDashboard, roles: ["saasadmin"] },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "teacher"] },
  { label: "My children", href: "/parent/dashboard", icon: GraduationCap, roles: ["parent", "student"] },
  { label: "Students", href: "/students", icon: GraduationCap, roles: ["admin", "teacher"] },
  { label: "Staff", href: "/staff", icon: Users, roles: ["admin"] },
  { label: "Classes", href: "/classes", icon: BookOpen, roles: ["admin", "teacher"] },
  { label: "Subjects", href: "/subjects", icon: Library, roles: ["admin", "teacher"] },
  { label: "Attendance", href: "/attendance", icon: ClipboardCheck, roles: ["admin", "teacher"] },
  { label: "Exams", href: "/exams", icon: FileBarChart, roles: ["admin", "teacher"] },
  { label: "Results", href: "/results", icon: FileBarChart, roles: ["admin", "teacher"] },
  { label: "Timetable", href: "/timetable", icon: CalendarDays, roles: ["admin", "teacher"] },
  { label: "Fees", href: "/fees", icon: CircleDollarSign, roles: ["admin", "accountant"] },
  { label: "Parents", href: "/parents", icon: Users, roles: ["admin"] },
  { label: "Reports", href: "/reports", icon: FileBarChart, roles: ["admin", "teacher", "accountant"] },
  { label: "Users", href: "/users", icon: UserCog, roles: ["admin"] },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!canAccess(user.role, pathname)) router.replace(HOME_FOR_ROLE[user.role]);
  }, [user, loading, pathname, router]);

  if (loading || !user) {
    return (
      <main className="ui-boot">
        <span className="brand-mark">P</span>
        <p>Loading your workspace…</p>
      </main>
    );
  }

  const items = NAV.filter((item) => item.roles.includes(user.role));

  return (
    <main className="app-shell">
      <aside className={`app-sidebar ${open ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`}>
        <div className="app-brand">
          <span className="brand-mark">P</span>
          <b>
            PrimeSchool
          </b>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
          <button className="sidebar-toggle" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        <p className="side-label">WORKSPACE</p>
        <nav>
          {items.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="side-bottom">
          <Link href="/announcements" onClick={() => setOpen(false)}>
            <Bell size={17} />
            Announcements
          </Link>
          {(user.role === "admin" || user.role === "saasadmin") && (
            <Link href="/settings" onClick={() => setOpen(false)}>
              <Settings size={17} />
              Settings
            </Link>
          )}
          <div className="profile">
            <span>{initials(user.full_name)}</span>
            <b>
              {user.full_name}
              <small>{ROLE_LABEL[user.role]}</small>
            </b>
            <button className="ui-icon-button" onClick={signOut} aria-label="Sign out" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <section className="app-content">
        <header className="app-header">
          <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={21} />
          </button>
          <div>
            <span className="date-line">{longDate()}</span>
            <h1>{items.find((item) => pathname.startsWith(item.href))?.label ?? "PrimeSchool"}</h1>
          </div>
          <div className="header-tools">
            <Link href="/announcements" aria-label="Announcements" className="ui-icon-button">
              <Bell size={18} />
            </Link>
            <span className="header-avatar">{initials(user.full_name)}</span>
          </div>
        </header>
        <div className="module-body">{children}</div>
      </section>
    </main>
  );
}
