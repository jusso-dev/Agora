"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (formData: FormData) => {
    setPending(true);
    setError(null);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");
    try {
      const result =
        mode === "signup"
          ? await signUp.email({ email, password, name })
          : await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Something went wrong");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      action={submit}
      className="mx-auto w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 bg-white p-6"
    >
      <h1 className="text-lg font-semibold">{mode === "signup" ? "Create account" : "Sign in"}</h1>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {mode === "signup" && (
        <input
          name="name"
          required
          placeholder="Full name"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
      )}
      <input
        name="email"
        type="email"
        required
        placeholder="you@company.com"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="Password (min 8 chars)"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />
      <button
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {pending ? "…" : mode === "signup" ? "Sign up" : "Sign in"}
      </button>
      <p className="text-center text-xs text-neutral-400">
        {mode === "signup" ? (
          <>
            Have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="underline">
              Create account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
