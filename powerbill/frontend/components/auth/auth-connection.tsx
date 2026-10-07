"use client";
import { useEffect, useState } from "react";
import { prepareAuthSession } from "@/lib/api";

export function AuthConnection({ apiOrigin }: { apiOrigin: string }) {
  const [connecting, setConnecting] = useState(true);
  useEffect(() => {
    let active = true;
    void prepareAuthSession(apiOrigin).catch(() => {}).finally(() => { if (active) setConnecting(false); });
    return () => { active = false; };
  }, [apiOrigin]);
  return connecting ? <p role="status" className="auth-connection-status">Connecting securely to your account…</p> : null;
}
