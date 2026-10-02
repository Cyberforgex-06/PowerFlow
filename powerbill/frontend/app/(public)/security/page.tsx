import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
const rows=[
 ["Stolen session","HttpOnly, Secure, SameSite=Lax cookie; new session on login; 30-minute lifetime."],
 ["Cross-site request","CSRF token in X-CSRF-Token plus Origin checking on every state-changing request."],
 ["Password guessing","bcrypt with 12 rounds, generic login failures, IP rate limiting, and 5 failures → 15-minute account lockout."],
 ["SQL injection","SQLAlchemy/parameterised queries, allowlisted filters, escaped LIKE wildcards."],
 ["IDOR / bill theft","Server-side role checks and bill ownership checks; another customer’s bill intentionally returns 404 and the attempt is audited."],
 ["Cross-site scripting","JSON-only API, React output escaping, no dangerouslySetInnerHTML, and a per-request nonce CSP."],
 ["Double payment","Payment amount is loaded from the bill inside a database row lock; one payment per bill with a unique reference."],
 ["Sensitive data leakage","No card data, secrets in environment variables, no production stack traces, authenticated API responses marked no-store."],
 ["Clickjacking / browser abuse","frame-ancestors 'none', X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy and production HSTS."],
];
export default function Security(){return <main className="content-wrap py-14 md:py-20"><PageHeader eyebrow="PUBLIC SECURITY PAGE" title="Security you can point to in your defense." description="Each row maps a practical web threat to a concrete control in PowerBill. The browser UI is never treated as an authorization boundary."/><Card className="mt-9 p-5 md:p-6"><p className="font-mono text-[10px] font-bold tracking-[.08em] text-forest">REQUEST PATH</p><p className="mt-3 text-sm leading-6 text-info">Browser → same-origin Next.js <span className="data-number">/api/*</span> rewrite → Flask JSON API → PostgreSQL. Authentication uses our Flask session cookie; Supabase Auth is not used.</p></Card><div className="mt-6 overflow-hidden rounded-card border border-line bg-white"><div className="hidden grid-cols-[.32fr_.68fr] bg-muted px-5 py-3 font-mono text-[10px] font-bold tracking-[.06em] text-info md:grid"><span>THREAT</span><span>POWERBILL PROTECTION</span></div>{rows.map(([a,b])=><div key={a} className="grid gap-2 border-t border-line-subtle p-5 first:border-t-0 md:grid-cols-[.32fr_.68fr]"><h2 className="font-semibold">{a}</h2><p className="text-sm leading-6 text-info">{b}</p></div>)}</div></main>}
