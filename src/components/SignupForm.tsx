"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    email: "",
    password: "",
    inviteCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    // Auto sign-in after successful registration.
    const signInRes = await signIn("credentials", {
      identifier: form.username,
      password: form.password,
      redirect: false,
    });
    setSubmitting(false);

    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    router.push("/");
    router.refresh();
  }

  const fields: Array<{
    name: keyof typeof form;
    label: string;
    type: string;
    autoComplete?: string;
  }> = [
    { name: "displayName", label: "Display name", type: "text", autoComplete: "name" },
    { name: "username", label: "Username", type: "text", autoComplete: "username" },
    { name: "email", label: "Email", type: "email", autoComplete: "email" },
    { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
    { name: "inviteCode", label: "Invite code", type: "text" },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-3xl font-bold text-accent-dark">Join the club</h1>
      <p className="mb-8 text-sm text-ink/60">
        You&apos;ll need the shared invite code to register.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="mb-1 block text-sm font-medium">
              {field.label}
            </label>
            <input
              id={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              required
              value={form[field.name]}
              onChange={update(field.name)}
              className="w-full rounded-md border border-accent/30 bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </div>
        ))}

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-accent px-4 py-2 font-semibold text-paper transition hover:bg-accent-dark disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/60">
        Already a member?{" "}
        <Link href="/login" className="font-semibold text-accent-dark hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
