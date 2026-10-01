"use client";
import { useState } from "react";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Select } from "@/components/ui/field";
import { ApiError, apiRequest } from "@/lib/api";
import type { Bill, Payment } from "@/lib/types";
export function RecordPaymentForm({billId}:{billId:string}){const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setMessage("");const fd=new FormData(e.currentTarget);setBusy(true);try{await apiRequest<{payment:Payment;bill:Bill}>(`/api/v1/staff/bills/${billId}/pay`,{method:"POST",body:JSON.stringify({method:String(fd.get("method")??"cash")})});window.location.reload()}catch(e){setMessage(e instanceof ApiError?e.message:"Payment could not be recorded.")}finally{setBusy(false)}}return <form onSubmit={submit}><FieldLabel htmlFor="method">Payment method</FieldLabel><Select id="method" name="method" defaultValue="cash"><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="ussd">USSD</option></Select><Button disabled={busy} className="mt-4 w-full" type="submit"><Banknote size={17} strokeWidth={1.8}/>{busy?"Recording…":"Record payment"}</Button>{message?<p role="alert" className="mt-3 text-sm text-status-overdue">{message}</p>:null}<p className="mt-3 text-xs leading-5 text-info">The amount is read from the bill on the server. This form never sends an amount.</p></form>}
