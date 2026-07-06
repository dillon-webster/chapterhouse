"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function SetupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    setInviteCode(data.inviteCode ?? null);
  }

  async function enterApp() {
    setEntering(true);
    const res = await signIn("credentials", {
      identifier: form.username,
      password: form.password,
      redirect: false,
    });
    if (res?.error) {
      router.push("/login");
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (inviteCode) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <h1 className="mb-1 text-3xl font-bold text-accent-dark">You&apos;re all set!</h1>
        <p className="mb-8 text-sm text-ink/60">
          Your admin account is ready. Friends join with this invite code:
        </p>

        <div className="mb-3 rounded-xl border border-accent/30 bg-surface px-6 py-5 text-center">
          <p className="text-2xl font-bold tracking-[0.2em] text-accent-dark">{inviteCode}</p>
        </div>
        <p className="mb-8 text-center text-xs text-ink/50">
          Admins can always find this later on the Members page.
        </p>

        <button
          onClick={enterApp}
          disabled={entering}
          className="w-full rounded-md bg-accent px-4 py-2 font-semibold text-paper transition hover:bg-accent-dark disabled:opacity-50"
        >
          {entering ? "Signing in…" : "Enter Chapterhouse"}
        </button>
      </main>
    );
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
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-3xl font-bold text-accent-dark">Welcome to Chapterhouse</h1>
      <p className="mb-8 text-sm text-ink/60">
        Create the admin account for your club. You&apos;ll get an invite code to
        share with friends right after.
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
          {submitting ? "Setting up…" : "Create admin account"}
        </button>
      </form>
    </main>
  );
}
