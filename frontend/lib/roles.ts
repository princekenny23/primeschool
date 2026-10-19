import type { Role } from "./types";

export const HOME_FOR_ROLE: Record<Role, string> = {
  saasadmin: "/schools",
  admin: "/dashboard",
  teacher: "/dashboard",
  accountant: "/fees",
  parent: "/login",
  student: "/login",
};

export const ROLE_LABEL: Record<Role, string> = {
  saasadmin: "SaaS Admin",
  admin: "Administrator",
  teacher: "Teacher",
  accountant: "Accountant",
  parent: "Parent",
  student: "Student",
};

/** Route prefix → roles allowed to open it. */
const ACCESS: { prefix: string; roles: Role[] }[] = [
  { prefix: "/login", roles: ["saasadmin", "admin", "teacher", "accountant", "parent", "student"] },
  { prefix: "/schools", roles: ["saasadmin"] },
  { prefix: "/dashboard", roles: ["admin", "teacher"] },
  { prefix: "/school-setup", roles: ["admin", "saasadmin"] },
  { prefix: "/students", roles: ["admin", "teacher"] },
  { prefix: "/staff", roles: ["admin"] },
  { prefix: "/classes", roles: ["admin", "teacher"] },
  { prefix: "/subjects", roles: ["admin", "teacher"] },
  { prefix: "/attendance", roles: ["admin", "teacher"] },
  { prefix: "/exams", roles: ["admin", "teacher"] },
  { prefix: "/results", roles: ["admin", "teacher"] },
  { prefix: "/timetable", roles: ["admin", "teacher"] },
  { prefix: "/fees", roles: ["admin", "accountant"] },
  { prefix: "/payments", roles: ["admin", "accountant"] },
  { prefix: "/parents", roles: ["admin"] },
  { prefix: "/announcements", roles: ["admin", "teacher", "accountant", "parent", "student"] },
  { prefix: "/reports", roles: ["admin", "accountant", "teacher"] },
  { prefix: "/users", roles: ["admin"] },
  { prefix: "/settings", roles: ["admin", "saasadmin"] },
];

export function canAccess(role: Role | undefined, pathname: string) {
  if (!role) return false;
  const match = ACCESS.find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`));
  return match ? match.roles.includes(role) : false;
}
