"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormGrid, Notice, PageHeader, Section } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useList } from "@/lib/useApi";
import type { ClassRoom, Exam, Subject, Term } from "@/lib/types";

export default function NewExamPage() {
  const router = useRouter();
  const terms = useList<Term>("/terms/");
  const subjects = useList<Subject>("/subjects/");
  const classes = useList<ClassRoom>("/class-rooms/");

  const [form, setForm] = useState({ name: "", term: "", starts_on: "", ends_on: "", max_marks: "100" });
  const [pickedClasses, setPickedClasses] = useState<number[]>([]);
  const [pickedSubjects, setPickedSubjects] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (list: number[], setList: (value: number[]) => void, id: number) =>
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const exam = await api.post<Exam>("/exams/", {
        name: form.name,
        term: Number(form.term),
        starts_on: form.starts_on,
        ends_on: form.ends_on,
        is_published: false,
      });
      for (const classroom of pickedClasses) {
        for (const subject of pickedSubjects) {
          await api.post("/exam-subjects/", { exam: exam.id, classroom, subject, max_marks: Number(form.max_marks) });
        }
      }
      router.push("/exams");
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not create the exam.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        eyebrow="ACADEMICS"
        title="Create an exam"
        description="Set the window, then choose which classes sit which subjects."
        action={
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create exam"}
          </button>
        }
      />
      {error && <Notice>{error}</Notice>}

      <Section title="Exam details">
        <FormGrid>
          <Field label="Exam name">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </Field>
          <Field label="Term">
            <select value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })} required>
              <option value="">Select term</option>
              {terms.data.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name} · {term.academic_year_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Starts on">
            <input type="date" value={form.starts_on} onChange={(event) => setForm({ ...form, starts_on: event.target.value })} required />
          </Field>
          <Field label="Ends on">
            <input type="date" value={form.ends_on} onChange={(event) => setForm({ ...form, ends_on: event.target.value })} required />
          </Field>
          <Field label="Marks per subject">
            <input type="number" value={form.max_marks} onChange={(event) => setForm({ ...form, max_marks: event.target.value })} />
          </Field>
        </FormGrid>
      </Section>

      <Section title="Classes sitting this exam">
        <div className="ui-actions">
          {classes.data.map((room) => (
            <button
              type="button"
              key={room.id}
              className={pickedClasses.includes(room.id) ? "primary-button" : "ui-ghost-button"}
              onClick={() => toggle(pickedClasses, setPickedClasses, room.id)}
            >
              {room.name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Subjects examined">
        <div className="ui-actions">
          {subjects.data.map((subject) => (
            <button
              type="button"
              key={subject.id}
              className={pickedSubjects.includes(subject.id) ? "primary-button" : "ui-ghost-button"}
              onClick={() => toggle(pickedSubjects, setPickedSubjects, subject.id)}
            >
              {subject.name}
            </button>
          ))}
        </div>
      </Section>
    </form>
  );
}
