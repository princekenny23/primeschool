"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, DataTable, Loading, Notice, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useList } from "@/lib/useApi";
import type { ClassRoom, Student } from "@/lib/types";

export default function StudentsPage() {
  const router = useRouter();
  const [classroom, setClassroom] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");
  const [actionError, setActionError] = useState("");

  const classes = useList<ClassRoom>("/class-rooms/");
  const { data: students, loading, error, reload } = useList<Student>("/students/", { classroom, gender, status });

  async function toggleStatus(student: Student) {
    try {
      await api.patch(`/students/${student.id}/`, { status: student.status === "active" ? "inactive" : "active" });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.readable : "Could not update the student.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="PEOPLE"
        title="Students"
        description="Manage enrolment, profiles and academic records."
        action={
          <Link href="/students/new" className="primary-button">
            <Plus size={16} />
            Add student
          </Link>
        }
      />

      <div className="ui-filter-bar">
        <label className="ui-field">
          <span>Class</span>
          <select value={classroom} onChange={(event) => setClassroom(event.target.value)}>
            <option value="">All classes</option>
            {classes.data.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span>Gender</span>
          <select value={gender} onChange={(event) => setGender(event.target.value)}>
            <option value="">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
        <label className="ui-field">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
          </select>
        </label>
      </div>

      {error && <Notice>{error}</Notice>}
      {actionError && <Notice>{actionError}</Notice>}
      {loading ? (
        <Loading label="Loading students…" />
      ) : (
        <DataTable<Student>
          rows={students}
          exportName="students"
          searchPlaceholder="Search by name or admission number"
          onRowClick={(row) => router.push(`/students/${row.id}`)}
          rowActions={(row) => [
            { label: "View student record", onSelect: () => router.push(`/students/${row.id}`) },
            { label: row.status === "active" ? "Deactivate student" : "Reactivate student", onSelect: () => void toggleStatus(row), danger: row.status === "active" },
          ]}
          emptyText="No students match these filters."
          columns={[
            {
              header: "Student",
              value: (row) => row.full_name,
              cell: (row) => (
                <span className="ui-cell-strong">
                  {row.full_name}
                  <br />
                  <span className="ui-cell-muted">{row.email || "—"}</span>
                </span>
              ),
            },
            { header: "Admission no.", value: (row) => row.admission_number, cell: (row) => row.admission_number },
            { header: "Class", value: (row) => row.current_class ?? "", cell: (row) => row.current_class || "Unassigned" },
            { header: "Guardian", value: (row) => row.parent_name ?? "", cell: (row) => row.parent_name || "—" },
            { header: "Status", value: (row) => row.status, cell: (row) => <Badge value={row.status} /> },
          ]}
        />
      )}
    </>
  );
}
