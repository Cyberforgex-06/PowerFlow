import { PublicFooter } from "@/components/layout/public-footer";
import { PublicNav } from "@/components/layout/public-nav";
export default function PublicLayout({children}:{children:React.ReactNode}){return <><PublicNav/>{children}<PublicFooter/></>}
