import { requireCustomer } from "@/lib/auth";
import { PageHeading, Empty } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { markRead } from "@/lib/actions";
import { date } from "@/lib/format";
export default async function Notifications() {
  const { client, user } = await requireCustomer();
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load notifications.");
  return (
    <>
      <PageHeading
        title="Notifications"
        description="Updates about your bills and electricity account."
      />
      <section className="panel">
        {data?.length ? (
          data.map((n) => (
            <article
              className={`notification ${n.read_at ? "" : "unread"}`}
              key={n.id}
            >
              <div>
                <small>
                  {date(n.created_at)} · {n.read_at ? "Read" : "Unread"}
                </small>
                <h3>{n.title}</h3>
                <p>{n.message}</p>
              </div>
              {!n.read_at && (
                <ActionForm action={markRead} label="Mark as read">
                  <input type="hidden" name="id" value={n.id} />
                </ActionForm>
              )}
            </article>
          ))
        ) : (
          <Empty title="You’re up to date">
            Account updates will appear here.
          </Empty>
        )}
      </section>
    </>
  );
}
