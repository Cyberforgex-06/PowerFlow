"use client";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { apiRequest, clearClientCsrf } from "@/lib/api";
export function LogoutButton(){const [busy,setBusy]=useState(false);return <button disabled={busy} onClick={async()=>{setBusy(true);try{await apiRequest<{ok:boolean}>("/api/v1/auth/logout",{method:"POST",body:"{}"});clearClientCsrf();window.location.assign("/");}finally{setBusy(false)}}} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-status-overdue hover:bg-[#FFF0EE]"><LogOut size={17} strokeWidth={1.8}/>{busy?"Logging out…":"Log out"}</button>}
