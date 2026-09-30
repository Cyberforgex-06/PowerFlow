import { requireCustomer } from "@/lib/auth";
import { PageHeading } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { updateProfile } from "@/lib/actions";
import Link from "next/link";
export default async function Profile() {
  const { profile } = await requireCustomer();
  return (
    <>
      <PageHeading
        title="Profile & security"
        description="Keep your account details up to date."
      />
      <div className="cards-grid">
        <section className="panel form-panel">
          <h2>Personal details</h2>
          <ActionForm action={updateProfile} label="Save changes">
            <label>
              Full name
              <input
                name="full_name"
                autoComplete="name"
                defaultValue={profile.full_name}
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <label>
              Email address
              <input
                value={profile.email ?? ""}
                readOnly
                aria-describedby="email-note"
              />
              <small id="email-note">
                This is the email you use to sign in.
              </small>
            </label>
            <label>
              Phone number
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={profile.phone ?? ""}
                maxLength={25}
              />
            </label>
          </ActionForm>
        </section>
        <section className="panel form-panel">
          <h2>Account security</h2>
          <p className="muted">
            Reset your password through a link sent to your registered email.
          </p>
          <Link className="button secondary" href="/forgot-password">
            Reset password
          </Link>
        </section>
      </div>
    </>
  );
}
