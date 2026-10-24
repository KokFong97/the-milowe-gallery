import { apiError } from "@/lib/api-errors";
import { findEventByCode, getEventSnapshot } from "@/lib/event-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const event = await findEventByCode(code);
    if (!event) {
      return Response.json({ error: "We could not find that event." }, { status: 404 });
    }
    return Response.json(await getEventSnapshot(event.id, false), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}

