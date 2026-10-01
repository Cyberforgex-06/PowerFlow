import Link from "next/link";
export function Brand({compact=false}:{compact?:boolean}){return <Link className="logo" href="/" aria-label="PowerBill home"><span className="mark"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13.5 2 5 13h6l-1 9 9-13h-6l.5-7Z" fill="currentColor"/></svg></span>{compact?null:"PowerBill"}</Link>}
