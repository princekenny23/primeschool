"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormGrid, Notice, PageHeader, Section } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useApi";
import type { AcademicYear, ClassRoom, Parent, Student } from "@/lib/types";

const EMPTY = {
  first_name: "", last_name: "", date_of_birth: "", gender: "", photo: "",
  address: "", phone: "", email: "", admission_number: "",
  guardian_name: "", guardian_relationship: "Guardian", guardian_phone: "", guardian_email: "",
  academic_year: "", classroom: "",
};

export default function NewStudentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const classes = useList<ClassRoom>("/class-rooms/");
  const years = useList<AcademicYear>("/academic-years/");
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      let parentId: number | null = null;
      if (form.guardian_name) {
        const guardian = await api.post<Parent>("/parents/", {
          school: user?.school,
          full_name: form.guardian_name,
          relationship: form.guardian_relationship,
          phone: form.guardian_phone,
          email: form.guardian_email,
        });
        parentId = guardian.id;
      }

      const student = await api.post<Student>("/students/", {
        school: user?.school,
        parent: parentId,
        admission_number: form.admission_number,
        first_name: form.first_name,
        last_name: form.last_name,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender,
        photo: form.photo,
        address: form.address,
        phone: form.phone,
        email: form.email,
      });

      if (form.classroom && form.academic_year) {
        await api.post("/enrollments/", {
          student: student.id,
          classroom: Number(form.classroom),
          academic_year: Number(form.academic_year),
        });
      }
      router.push(`/students/${student.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.readable : "Could not save the student.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        eyebrow="PEOPLE"
        title="Register a student"
        description="Create the learner profile, link a guardian and place them in a class."
        action={
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save student"}
          </button>
        }
      />

      {error && <Notice>{error}</Notice>}

      <Section title="Personal">
        <FormGrid>
          <Field label="First name">
            <input value={form.first_name} onChange={set("first_name")} required />
          </Field>
          <Field label="Last name">
            <input value={form.last_name} onChange={set("last_name")} required />
          </Field>
          <Field label="Date of birth">
            <input type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
          </Field>
          <Field label="Gender">
            <select value={form.gender} onChange={set("gender")}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </Field>
          <Field label="Photo URL" hint="Optional link to a profile photo">
            <input value={form.photo} onChange={set("photo")} />
          </Field>
        </FormGrid>
      </Section>

      <Section title="Contact">
        <FormGrid>
          <Field label="Address">
            <input value={form.address} onChange={set("address")} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={set("email")} />
          </Field>
        </FormGrid>
      </Section>

      <Section title="Guardian">
        <FormGrid>
          <Field label="Guardian name">
            <input value={form.guardian_name} onChange={set("guardian_name")} />
          </Field>
          <Field label="Relationship">
            <input value={form.guardian_relationship} onChange={set("guardian_relationship")} />
          </Field>
          <Field label="Guardian phone">
            <input value={form.guardian_phone} onChange={set("guardian_phone")} />
          </Field>
          <Field label="Guardian email">
            <input type="email" value={form.guardian_email} onChange={set("guardian_email")} />
          </Field>
        </FormGrid>
      </Section>

      <Section title="Academic">
        <FormGrid>
          <Field label="Admission number">
            <input value={form.admission_number} onChange={set("admission_number")} required />
          </Field>
          <Field label="Academic year">
            <select value={form.academic_year} onChange={set("academic_year")}>
              <option value="">Select year</option>
              {years.data.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Class">
            <select value={form.classroom} onChange={set("classroom")}>
              <option value="">Select class</option>
              {classes.data.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </Field>
        </FormGrid>
      </Section>
    </form>
  );
}
