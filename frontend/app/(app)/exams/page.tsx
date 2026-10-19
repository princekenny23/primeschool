"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, DataTable, Loading, Notice, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { useList } from "@/lib/useApi";
import type { Exam } from "@/lib/types";

export default function ExamsPage() {
  const router = useRouter();
  const { data, loading, error, reload } = useList<Exam>("/exams/");
  const [actionError, setActionError] = useState("");

  async function togglePublish(exam: Exam) {
    try {
      await api.post(`/exams/${exam.id}/publish/`);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.readable : "Could not update publication status.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ACADEMICS"
        title="Exams"
        description="Assessment windows, their subjects and publication state."
        action={
          <Link href="/exams/new" className="primary-button">
            <Plus size={16} />
            Create exam
          </Link>
        }
      />
      {error && <Notice>{error}</Notice>}
      {actionError && <Notice>{actionError}</Notice>}
      {loading ? (
        <Loading label="Loading exams…" />
      ) : (
        <DataTable<Exam>
          rows={data}
          exportName="exams"
          columns={[
            { header: "Exam", value: (row) => row.name, cell: (row) => <span className="ui-cell-strong">{row.name}</span> },
            { header: "Term", value: (row) => row.term_name ?? "", cell: (row) => `${row.term_name} · ${row.academic_year_name}` },
            { header: "Starts", value: (row) => row.starts_on, cell: (row) => shortDate(row.starts_on) },
            { header: "Ends", value: (row) => row.ends_on, cell: (row) => shortDate(row.ends_on) },
            {
              header: "Status",
              value: (row) => (row.is_published ? "Published" : "Draft"),
              cell: (row) => <Badge value={row.is_published ? "Published" : "Draft"} />,
            },
          ]}
          rowActions={(row) => [
            { label: "Enter marks", onSelect: () => router.push(`/exams/${row.id}/marks`) },
            { label: row.is_published ? "Unpublish results" : "Publish results", onSelect: () => void togglePublish(row) },
          ]}
        />
      )}
    </>
  );
}
