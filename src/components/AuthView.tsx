"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { PageMotion } from "@/components/PageMotion";

type AuthMode = "signin" | "join";

export function AuthView() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const endpoint = mode === "signin" ? "/api/account/login" : "/api/account/register";
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        name: form.get("name"), email: form.get("email"), password: form.get("password"), marketingOptIn: form.get("marketingOptIn") === "on",
      }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to continue");
      setMessage(mode === "signin" ? "Welcome back. Your client space is ready." : "Your client account is ready.");
      window.setTimeout(() => { window.location.href = "/account"; }, 350);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Unable to continue"); }
    finally { setBusy(false); }
  }

  return <>
    <PageMotion />
    <section className="auth-page page-reveal">
      <div className="auth-story">
        <p className="section-kicker">Private client access</p>
        <h1>{mode === "signin" ? "Welcome back to the crimson list." : "Join the Muxcor maison."}</h1>
        <p>Keep wishlisted products, inquiry preferences, and request history in one client space.</p>
        <div className="auth-benefits"><span><ShieldCheck size={18} /> Protected client profile</span><span><LockKeyhole size={18} /> Private wishlist and order archive</span></div>
      </div>
      <div className="auth-panel">
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
          <button type="button" className={mode === "join" ? "active" : ""} onClick={() => setMode("join")}>Register</button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "join" ? <label>Full name<input name="name" required autoComplete="name" placeholder="Your name" /></label> : null}
          <label>Email address<span><Mail size={18} /><input name="email" required autoComplete="email" placeholder="client@example.com" type="email" /></span></label>
          <label>Password<span><LockKeyhole size={18} /><input name="password" required minLength={10} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 10 characters" type={showPassword ? "text" : "password"} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          {mode === "join" ? <label className="checkbox-line"><input name="marketingOptIn" type="checkbox" /> I agree to receive collection updates and private client notes.</label> : <Link className="form-link" href="/account">Forgot password?</Link>}
          {error ? <p className="inquiry-error" role="alert">{error}</p> : null}
          {message ? <p className="form-success" role="status">{message}</p> : null}
          <button className="primary-link" type="submit" disabled={busy}>{busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}<ArrowRight size={18} /></button>
        </form>
      </div>
    </section>
  </>;
}
