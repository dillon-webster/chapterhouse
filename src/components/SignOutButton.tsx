"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-accent-dark underline-offset-2 hover:underline"
    >
      Sign out
    </button>
  );
}
