"use client";
import {useState} from "react";
import type {Tariff} from "@/lib/types";
import {formatNaira} from "@/lib/format";

export function Estimator({tariffs}:{tariffs:Tariff[]}){
 const [result,setResult]=useState<{units:number;energy:number;fixed:number;vat:number;total:number}|null>(null);
 const [error,setError]=useState("");
 function calculate(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const data=new FormData(e.currentTarget);const previous=Number(data.get("previous")),current=Number(data.get("current"));const tariff=tariffs.find(t=>t.id===data.get("tariff"));
  if(!tariff||!Number.isFinite(previous)||!Number.isFinite(current)||previous<0||current<previous||current>100000000){setError("Enter a valid current reading at least as high as your previous reading.");setResult(null);return;}
  const units=Math.round((current-previous)*10)/10,energy=Math.round(units*Number(tariff.rate_per_kwh)*100)/100,fixed=Number(tariff.fixed_charge),vat=Math.round((energy+fixed)*Number(tariff.vat_percent))/100;
  setResult({units,energy,fixed,vat,total:energy+fixed+vat});setError("");
 }
 return <div className="estimator-band estimator-contained rounded-xl !mb-0"><div className="estimator-grid"><div><p className="eyebrow">A little foresight</p><h2>A little clarity.<br/>Before the bill arrives.</h2><p>Estimate your bill using your readings and an active tariff. No account needed.</p></div>{tariffs.length?<form className="estimator-box" onSubmit={calculate}><h3>Estimate your bill</h3><div className="input-grid"><label className="field">Previous reading (kWh)<input name="previous" type="number" min="0" max="100000000" step="0.1" defaultValue="0" required/></label><label className="field">Current reading (kWh)<input name="current" type="number" min="0" max="100000000" step="0.1" defaultValue="150" required/></label><label className="field full">Tariff<select name="tariff">{tariffs.map(t=><option key={t.id} value={t.id}>{t.name} · {formatNaira(t.rate_per_kwh)} / kWh</option>)}</select></label></div><button className="btn" type="submit">Calculate estimate →</button><div className="estimate-result" aria-live="polite">{error?<p className="error-text">{error}</p>:result?<><span>{result.units} kWh · {formatNaira(result.energy)} energy + {formatNaira(result.fixed)} fixed + {formatNaira(result.vat)} VAT</span><strong>{formatNaira(result.total)}</strong></>:null}</div><p className="small muted mt-4">Estimate only. Your issued bill uses the tariff applicable to your meter.</p></form>:<div className="estimator-box estimator-signin"><h3>A clear estimate starts with the right tariff.</h3><p className="small muted">Tariffs are temporarily unavailable. Please try again later, or sign in to review an issued bill.</p><a className="btn" href="/login"><span>Sign in</span><span aria-hidden="true">→</span></a></div>}</div></div>
}
