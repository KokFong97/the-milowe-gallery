import { apiError } from "@/lib/api-errors";
import { findSingleEvent } from "@/lib/event-data";
import { handleGuestUpload } from "@/lib/guest-upload";

export async function POST(request: Request) {
  try {
    const event = await findSingleEvent();
    if (!event) {
      return Response.json(
        { error: "The wedding gallery is not ready yet." },
        { status: 404 },
      );
    }
    return await handleGuestUpload(request, event);
  } catch (error) {
    return apiError(error);
  }
}


// PUT avoids the framework's multipart POST server-action body limit.
export const PUT = POST;
