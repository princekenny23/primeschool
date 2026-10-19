"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, DataTable, Loading, Notice, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useList } from "@/lib/useApi";
import type { Teacher } from "@/lib/types";

export default function StaffPage() {
  const router = useRouter();
  const { data, loading, error, reload } = useList<Teacher>("/teachers/");
  const [actionError, setActionError] = useState("");

  async function toggleStatus(teacher: Teacher) {
    try {
      await api.patch(`/teachers/${teacher.id}/`, { status: teacher.status === "active" ? "inactive" : "active" });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.readable : "Could not update the staff record.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="PEOPLE"
        title="Staff"
        description="Teaching and support staff, their departments and assignments."
        action={
          <Link href="/staff/new" className="primary-button">
            <Plus size={16} />
            Add staff member
          </Link>
        }
      />
      {error && <Notice>{error}</Notice>}
      {actionError && <Notice>{actionError}</Notice>}
      {loading ? (
        <Loading label="Loading staff…" />
      ) : (
        <DataTable<Teacher>
          rows={data}
          exportName="staff"
          searchPlaceholder="Search staff"
          onRowClick={(row) => router.push(`/staff/${row.id}`)}
          rowActions={(row) => [
            { label: "View staff record", onSelect: () => router.push(`/staff/${row.id}`) },
            { label: row.status === "active" ? "Deactivate staff member" : "Reactivate staff member", onSelect: () => void toggleStatus(row), danger: row.status === "active" },
          ]}
          columns={[
            {
              header: "Name",
              value: (row) => row.full_name,
              cell: (row) => (
                <span className="ui-cell-strong">
                  {row.full_name}
                  <br />
                  <span className="ui-cell-muted">{row.employee_id}</span>
                </span>
              ),
            },
            { header: "Role", value: (row) => row.role, cell: (row) => row.role || "Teacher" },
            { header: "Department", value: (row) => row.department, cell: (row) => row.department || "—" },
            { header: "Phone", value: (row) => row.phone, cell: (row) => row.phone || "—" },
            { header: "Status", value: (row) => row.status, cell: (row) => <Badge value={row.status} /> },
          ]}
        />
      )}
    </>
  );
}
