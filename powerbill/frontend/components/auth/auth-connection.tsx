"use client";
import { useEffect } from "react";
import { prepareAuthSession } from "@/lib/api";

export function AuthConnection() {
  useEffect(() => { void prepareAuthSession().catch(() => { /* Form submission shows a recoverable error. */ }); }, []);
  return null;
}
