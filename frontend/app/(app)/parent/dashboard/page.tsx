"use client";

import { useEffect, useState } from "react";
import { Badge, DataTable, EmptyState, Loading, Notice, PageHeader, Panel, StatCard, Tabs } from "@/components/ui";
import { WEEKDAYS, money, percent, shortDate } from "@/lib/format";
import { useList } from "@/lib/useApi";
import type { Announcement, Attendance, Invoice, Result, Student, TimetableEntry } from "@/lib/types";

const TABS = ["Attendance", "Results", "Fees", "Timetable", "Announcements"];

export default function ParentDashboardPage() {
  const [tab, setTab] = useState("Attendance");
  const [child, setChild] = useState<Student | null>(null);
  const children = useList<Student>("/students/");

  useEffect(() => {
    if (!child && children.data.length) setChild(children.data[0]);
  }, [children.data, child]);

  const attendance = useList<Attendance>(child ? "/attendance/" : null, { student: child?.id }, [child?.id]);
  const results = useList<Result>(child ? "/results/" : null, { student: child?.id }, [child?.id]);
  const invoices = useList<Invoice>(child ? "/invoices/" : null, { student: child?.id }, [child?.id]);
  const timetable = useList<TimetableEntry>(
    child?.current_class_id ? "/timetable-entries/" : null,
    { classroom: child?.current_class_id },
    [child?.current_class_id]
  );
  const announcements = useList<Announcement>("/announcements/");

  if (children.loading) return <Loading label="Loading your children…" />;
  if (children.error) return <Notice>{children.error}</Notice>;
  if (!children.data.length) return <EmptyState title="No learners linked to this account" description="Ask the school office to link your children." />;

  const sessions = attendance.data.length;
  const present = attendance.data.filter((row) => row.status === "present" || row.status === "late").length;
  const billed = invoices.data.reduce((total, invoice) => total + Number(invoice.amount), 0);
  const paid = invoices.data.reduce((total, invoice) => total + Number(invoice.paid_total), 0);

  return (
    <>
      <PageHeader eyebrow="FAMILY" title="My children" description="Attendance, results, fees and school updates for your learners." />

      <div className="ui-actions" style={{ marginBottom: 20 }}>
        {children.data.map((student) => (
          <button
            key={student.id}
            className={student.id === child?.id ? "primary-button" : "ui-ghost-button"}
            onClick={() => setChild(student)}
          >
            {student.full_name} · {student.current_class || "Unassigned"}
          </button>
        ))}
      </div>

      <div className="metric-strip">
        <StatCard label="Attendance rate" value={percent(sessions ? Math.round((present / sessions) * 100) : 0)} />
        <StatCard label="Subjects assessed" value={new Set(results.data.map((row) => row.subject)).size} tone="teal" />
        <StatCard label="Fees paid" value={money(paid)} tone="gold" />
        <StatCard label="Balance" value={money(billed - paid)} tone="navy" />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "Attendance" && (
        <DataTable<Attendance>
          rows={attendance.data}
          searchable={false}
          columns={[
            { header: "Date", value: (row) => row.date, cell: (row) => shortDate(row.date) },
            { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name || "General" },
            { header: "Status", value: (row) => row.status, cell: (row) => <Badge value={row.status} /> },
          ]}
        />
      )}

      {tab === "Results" && (
        <DataTable<Result>
          rows={results.data}
          searchable={false}
          emptyText="Results appear once the school publishes the exam."
          columns={[
            { header: "Exam", value: (row) => row.exam_name ?? "", cell: (row) => row.exam_name },
            { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name },
            { header: "Total", value: (row) => row.score, cell: (row) => row.score },
            { header: "Grade", value: (row) => row.grade, cell: (row) => <Badge value={row.grade || "—"} /> },
          ]}
        />
      )}

      {tab === "Fees" && (
        <DataTable<Invoice>
          rows={invoices.data}
          searchable={false}
          columns={[
            { header: "Invoice", value: (row) => row.reference, cell: (row) => row.reference },
            { header: "Amount", value: (row) => row.amount, cell: (row) => money(row.amount) },
            { header: "Paid", value: (row) => row.paid_total, cell: (row) => money(row.paid_total) },
            { header: "Balance", value: (row) => row.balance, cell: (row) => money(row.balance) },
            { header: "Due", value: (row) => row.due_on, cell: (row) => shortDate(row.due_on) },
            { header: "Status", value: (row) => row.status, cell: (row) => <Badge value={row.status} /> },
          ]}
        />
      )}

      {tab === "Timetable" && (
        <DataTable<TimetableEntry>
          rows={timetable.data}
          searchable={false}
          columns={[
            { header: "Day", value: (row) => WEEKDAYS[row.weekday] ?? "", cell: (row) => WEEKDAYS[row.weekday] },
            { header: "Time", value: (row) => row.starts_at, cell: (row) => `${row.starts_at.slice(0, 5)} – ${row.ends_at.slice(0, 5)}` },
            { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name },
            { header: "Teacher", value: (row) => row.teacher_name ?? "", cell: (row) => row.teacher_name },
          ]}
        />
      )}

      {tab === "Announcements" && (
        <Panel title="School announcements">
          {announcements.data.length ? (
            <ul className="ui-feed">
              {announcements.data.map((item) => (
                <li key={item.id}>
                  <b>{item.title}</b>
                  <small>
                    {shortDate(item.published_at)} · {item.body}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No announcements yet" />
          )}
        </Panel>
      )}
    </>
  );
}
