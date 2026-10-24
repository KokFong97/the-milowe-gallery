import { apiError } from "@/lib/api-errors";
import { findEventByCode } from "@/lib/event-data";
import { handleGuestUpload } from "@/lib/guest-upload";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const event = await findEventByCode(code);
    if (!event) {
      return Response.json(
        { error: "We could not find that gallery." },
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
