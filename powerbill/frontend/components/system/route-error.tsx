"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export function RouteError({reset}:{reset:()=>void}){return <Card className="mx-auto max-w-2xl p-8"><AlertTriangle size={28} strokeWidth={1.8} className="text-status-overdue"/><h1 className="mt-5 font-display text-2xl font-bold">This page could not be loaded.</h1><p className="mt-2 text-sm leading-6 text-info">The server returned an unexpected error. No sensitive error details are displayed here.</p><Button onClick={reset} className="mt-6">Try again</Button></Card>}
