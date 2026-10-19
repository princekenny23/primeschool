"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, DataTable, EmptyState, Loading, Notice, Panel, Tabs } from "@/components/ui";
import { WEEKDAYS, initials, shortDate } from "@/lib/format";
import { useList, useQuery } from "@/lib/useApi";
import type { ClassRoom, Teacher, TeacherAssignment, TimetableEntry } from "@/lib/types";

const TABS = ["Overview", "Classes", "Subjects", "Timetable"];

export default function StaffProfilePage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState("Overview");
  const { data: teacher, loading, error } = useQuery<Teacher>(`/teachers/${params.id}/`);
  const assignments = useList<TeacherAssignment>("/teacher-assignments/", { teacher: params.id });
  const timetable = useList<TimetableEntry>("/timetable-entries/", { teacher: params.id });
  const classes = useList<ClassRoom>("/class-rooms/", { class_teacher: params.id });

  if (loading) return <Loading label="Loading staff member…" />;
  if (error) return <Notice>{error}</Notice>;
  if (!teacher) return <EmptyState title="Staff member not found" />;

  const subjects = Array.from(new Set(assignments.data.map((row) => row.subject_name).filter(Boolean)));

  return (
    <>
      <div className="ui-profile-head">
        <span className="ui-avatar">{initials(teacher.full_name)}</span>
        <div>
          <h2>{teacher.full_name}</h2>
          <p>
            {teacher.employee_id} · {teacher.department || "No department"} · <Badge value={teacher.status} />
          </p>
        </div>
        <div className="ui-profile-actions">
          <Link href="/staff" className="ui-ghost-button">
            Back to staff
          </Link>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "Overview" && (
        <Panel title="Profile">
          <div className="ui-definition">
            <div>
              <span>Role</span>
              <b>{teacher.role || "Teacher"}</b>
            </div>
            <div>
              <span>Department</span>
              <b>{teacher.department || "—"}</b>
            </div>
            <div>
              <span>Email</span>
              <b>{teacher.email || "—"}</b>
            </div>
            <div>
              <span>Phone</span>
              <b>{teacher.phone || "—"}</b>
            </div>
            <div>
              <span>Joined</span>
              <b>{shortDate(teacher.joined_on)}</b>
            </div>
            <div>
              <span>Subjects taught</span>
              <b>{subjects.length}</b>
            </div>
          </div>
        </Panel>
      )}

      {tab === "Classes" && (
        <DataTable<ClassRoom>
          rows={classes.data}
          searchable={false}
          emptyText="Not a class teacher for any class."
          columns={[
            { header: "Class", value: (row) => row.name, cell: (row) => row.name },
            { header: "Level", value: (row) => row.level, cell: (row) => row.level },
            { header: "Students", value: (row) => row.student_count ?? 0, cell: (row) => row.student_count ?? 0 },
          ]}
        />
      )}

      {tab === "Subjects" && (
        <DataTable<TeacherAssignment>
          rows={assignments.data}
          searchable={false}
          emptyText="No subject assignments yet."
          columns={[
            { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name },
            { header: "Class", value: (row) => row.classroom_name ?? "", cell: (row) => row.classroom_name },
          ]}
        />
      )}

      {tab === "Timetable" && (
        <DataTable<TimetableEntry>
          rows={timetable.data}
          searchable={false}
          emptyText="No lessons scheduled."
          columns={[
            { header: "Day", value: (row) => WEEKDAYS[row.weekday] ?? "", cell: (row) => WEEKDAYS[row.weekday] },
            { header: "Time", value: (row) => row.starts_at, cell: (row) => `${row.starts_at.slice(0, 5)} – ${row.ends_at.slice(0, 5)}` },
            { header: "Class", value: (row) => row.classroom_name ?? "", cell: (row) => row.classroom_name },
            { header: "Subject", value: (row) => row.subject_name ?? "", cell: (row) => row.subject_name },
            { header: "Room", value: (row) => row.room_name ?? "", cell: (row) => row.room_name || "—" },
          ]}
        />
      )}
    </>
  );
}
