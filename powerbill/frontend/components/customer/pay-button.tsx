"use client";
import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import type { Bill, Payment } from "@/lib/types";
export function PayButton({billId}:{billId:string}){const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");async function pay(){setBusy(true);setMessage("");try{await apiRequest<{payment:Payment;bill:Bill}>(`/api/v1/me/bills/${billId}/pay`,{method:"POST",body:JSON.stringify({method:"simulated"})});window.location.assign(`/receipts/${billId}`)}catch(e){setMessage(e instanceof ApiError?e.message:"Payment could not be recorded.")}finally{setBusy(false)}}return <div><Button aria-busy={busy} disabled={busy} onClick={pay} className="w-full"><CreditCard size={17} strokeWidth={1.8}/>{busy?"Recording payment…":"Pay this bill"}</Button>{message?<p role="alert" className="mt-3 text-sm text-status-overdue">{message}</p>:null}<p className="mt-3 text-xs leading-5 text-info">Payment is simulated for this university project. No card data is collected or stored.</p></div>}
