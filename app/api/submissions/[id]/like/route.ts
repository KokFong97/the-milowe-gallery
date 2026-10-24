import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { apiError } from "@/lib/api-errors";

async function updateLike(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const { id } = await params;
    const db = env.DB!;
    const row = await db.prepare("SELECT e.status FROM submissions s JOIN events e ON e.id = s.event_id WHERE s.id = ? AND s.status = 'approved' AND s.deleted_at IS NULL").bind(id).first<{ status: string }>();
    if (!row) return Response.json({ error: "Photo not found." }, { status: 404 });
    if (row.status !== "voting") return Response.json({ error: "Likes are only open during Guest voting." }, { status: 409 });
    const existing = (await cookies()).get("milowe-voter")?.value;
    const voter = existing && /^[a-f0-9-]{36}$/.test(existing) ? existing : crypto.randomUUID();
    // Check the phase inside the write as well, so a concurrent phase change locks voting.
    if (request.method === "DELETE") {
      await db.prepare("DELETE FROM likes WHERE submission_id = ? AND voter_id = ? AND EXISTS (SELECT 1 FROM submissions s JOIN events e ON e.id = s.event_id WHERE s.id = likes.submission_id AND s.status = 'approved' AND s.deleted_at IS NULL AND e.status = 'voting')").bind(id, voter).run();
    } else {
    await db.prepare("INSERT INTO likes (submission_id, voter_id) SELECT s.id, ? FROM submissions s JOIN events e ON e.id = s.event_id WHERE s.id = ? AND s.status = 'approved' AND s.deleted_at IS NULL AND e.status = 'voting' ON CONFLICT (submission_id, voter_id) DO NOTHING").bind(voter, id).run();
    }
    const result = await db.prepare("SELECT count(*) AS likeCount, COALESCE(MAX(voter_id = ?), 0) AS likedByMe FROM likes WHERE submission_id = ?").bind(voter, id).first<{ likeCount: number; likedByMe: number }>();
    return Response.json({ likeCount: result?.likeCount ?? 0, likedByMe: Boolean(result?.likedByMe) }, { headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": `milowe-voter=${voter}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    } });
  } catch (error) { return apiError(error); }
}

export const POST = updateLike;
export const DELETE = updateLike;
