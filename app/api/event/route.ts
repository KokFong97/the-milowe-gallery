import { apiError } from "@/lib/api-errors";
import { findSingleEvent, getEventSnapshot } from "@/lib/event-data";

export async function GET() {
  try {
    const event = await findSingleEvent();
    if (!event) {
      return Response.json(
        { error: "The wedding gallery is not ready yet." },
        { status: 404 },
      );
    }
    return Response.json(await getEventSnapshot(event.id, false), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}

