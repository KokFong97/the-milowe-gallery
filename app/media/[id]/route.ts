import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-auth";
import { getDb } from "@/db";
import { submissions } from "@/db/schema";
import { eventBelongsToUser } from "@/lib/event-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!submission || !env.BUCKET) return new Response("Not found", { status: 404 });

  if (submission.deletedAt || submission.status !== "approved") {
    const user = await getAdminUser();
    if (!user || !(await eventBelongsToUser(submission.eventId, user.userId))) {
      return new Response("Not found", { status: 404 });
    }
  }
  const object = await env.BUCKET.get(submission.objectKey);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set(
    "Cache-Control",
    "private, no-store",
  );
  return new Response(object.body, { headers });
}

