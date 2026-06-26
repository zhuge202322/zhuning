"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { PageMotion } from "@/components/PageMotion";

type AuthMode = "signin" | "join";

export function AuthView() {
  const [mode, setMode] = useState<AuthMode>("signin");

  return (
    <>
      <PageMotion />
      <section className="auth-page page-reveal">
        <div className="auth-story">
          <p className="section-kicker">Private client access</p>
          <h1>{mode === "signin" ? "Welcome back to the crimson list." : "Join the Muxcor maison."}</h1>
          <p>
            Keep wishlisted rings, checkout preferences, order history, and early
            access notes in one polished client space.
          </p>
          <div className="auth-benefits">
            <span>
              <ShieldCheck size={18} />
              Protected checkout profile
            </span>
            <span>
              <LockKeyhole size={18} />
              Private wishlist and order archive
            </span>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={mode === "signin" ? "active" : ""}
              role="tab"
              aria-selected={mode === "signin"}
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "join" ? "active" : ""}
              role="tab"
              aria-selected={mode === "join"}
              onClick={() => setMode("join")}
            >
              Register
            </button>
          </div>

          <form className="auth-form">
            {mode === "join" ? (
              <label>
                Full name
                <input autoComplete="name" placeholder="Your name" type="text" />
              </label>
            ) : null}
            <label>
              Email address
              <span>
                <Mail size={18} />
                <input autoComplete="email" placeholder="client@example.com" type="email" />
              </span>
            </label>
            <label>
              Password
              <span>
                <LockKeyhole size={18} />
                <input
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="Enter password"
                  type="password"
                />
                <button type="button" aria-label="Show password">
                  <Eye size={18} />
                </button>
              </span>
            </label>

            {mode === "join" ? (
              <label className="checkbox-line">
                <input type="checkbox" />
                I agree to receive new collection updates and private client notes.
              </label>
            ) : (
              <Link className="form-link" href="/account">
                Forgot password?
              </Link>
            )}

            <button className="primary-link" type="submit">
              {mode === "signin" ? "Sign in" : "Create account"}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
