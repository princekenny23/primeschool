"use client";

import Link from "next/link";
import { CalendarPlus, ClipboardCheck, Megaphone, Receipt, UserPlus } from "lucide-react";
import { BarChart, EmptyState, Loading, Notice, PageHeader, Panel, StatCard } from "@/components/ui";
import { money, percent, shortDate } from "@/lib/format";
import { useQuery } from "@/lib/useApi";
import type { DashboardSummary } from "@/lib/types";

const QUICK_ACTIONS = [
  { label: "Add student", href: "/students/new", icon: UserPlus },
  { label: "Record payment", href: "/payments/new", icon: Receipt },
  { label: "Mark attendance", href: "/attendance", icon: ClipboardCheck },
  { label: "Create exam", href: "/exams/new", icon: CalendarPlus },
  { label: "Publish announcement", href: "/announcements", icon: Megaphone },
];

export default function DashboardPage() {
  const { data, loading, error } = useQuery<DashboardSummary>("/dashboard/summary/");

  return (
    <>
      <PageHeader
        eyebrow="OVERVIEW"
        title="School command centre"
        description="Everything happening across enrolment, attendance, academics and finance today."
      />

      {error && <Notice>{error}</Notice>}
      {loading && <Loading label="Gathering today's numbers…" />}

      {data && (
        <>
          <div className="metric-strip">
            <StatCard label="Total students" value={data.total_students} hint="Enrolled learners" />
            <StatCard label="Total teachers" value={data.total_teachers} hint="Active staff" tone="teal" />
            <StatCard label="Attendance today" value={percent(data.attendance_rate)} hint={`${data.attendance_marked} records marked`} tone="gold" />
            <StatCard label="Fees collected" value={money(data.fees_collected)} hint={`of ${money(data.fees_billed)} billed`} tone="navy" />
            <StatCard label="Outstanding fees" value={money(data.fees_outstanding)} hint="Awaiting settlement" />
          </div>

          <div className="ui-actions" style={{ marginBottom: 22 }}>
            {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className="ui-ghost-button">
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>

          <div className="ui-grid ui-grid-2">
            <Panel title="Attendance this week">
              <BarChart data={data.attendance_trend} suffix="%" />
            </Panel>
            <Panel title="Enrolment by class">
              <BarChart data={data.enrollment_by_class} />
            </Panel>
            <Panel title="Fee collection trend">
              <BarChart data={data.fee_trend} />
            </Panel>
            <Panel title="Upcoming exams" action={<Link href="/exams" className="ui-row-link">View all</Link>}>
              {data.upcoming_exams.length ? (
                <ul className="ui-feed">
                  {data.upcoming_exams.map((exam) => (
                    <li key={exam.id}>
                      <b>{exam.name}</b>
                      <small>
                        {exam.term_name} · {shortDate(exam.starts_on)} – {shortDate(exam.ends_on)}
                      </small>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No exams scheduled" description="Create an exam to see it here." />
              )}
            </Panel>
            <Panel title="Recent activity">
              {data.recent_activity.length ? (
                <ul className="ui-feed">
                  {data.recent_activity.map((item, index) => (
                    <li key={index}>
                      <b>{item.title}</b>
                      <small>
                        {item.detail} · {shortDate(item.at)}
                      </small>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Nothing has happened yet today" />
              )}
            </Panel>
            <Panel title="Announcements" action={<Link href="/announcements" className="ui-row-link">Manage</Link>}>
              {data.announcements.length ? (
                <ul className="ui-feed">
                  {data.announcements.map((item) => (
                    <li key={item.id}>
                      <b>{item.title}</b>
                      <small>{item.body.slice(0, 90)}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No published announcements" />
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
