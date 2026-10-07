import Link from "next/link";
import {Brand} from "./brand";
export function PublicFooter(){return <footer className="site-footer"><div className="wrap footer-row"><Brand/><nav className="footer-links" aria-label="Footer"><Link href="/#help">Help</Link><Link href="/security">Account security</Link><Link href="/login">Sign in</Link><Link href="/register">Create account</Link></nav><p className="footer-note">A clearer kind of energy.<br/>A little less on your mind.</p></div></footer>}
