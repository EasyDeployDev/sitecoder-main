"use client";

import { useActionState } from "react";
import { signInAction } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, isPending] = useActionState(signInAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-slate-300">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500"
          placeholder="you@company.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-slate-300">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-500 text-white hover:bg-blue-400"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
