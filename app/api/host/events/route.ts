import { desc, eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-auth";
import { getDb } from "@/db";
import { categories, events } from "@/db/schema";
import { apiError, unauthorized } from "@/lib/api-errors";
import { getEventSnapshot } from "@/lib/event-data";

const defaultCategories = [
  { title: "The biggest joy", prompt: "Find the laugh, grin or happy tear that tells the whole story.", icon: "Smile" },
  { title: "In the details", prompt: "Capture a small detail the host might never get to see.", icon: "Sparkles" },
  { title: "Together", prompt: "Photograph a connection between people who belong in the same frame.", icon: "Users" },
  { title: "A little unexpected", prompt: "Spot the surprising, funny or beautifully unplanned moment.", icon: "WandSparkles" },
  { title: "One for the wall", prompt: "Make the photograph you would frame tomorrow.", icon: "Image" },
];

function createCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

export async function GET() {
  try {
    const user = await getAdminUser();
    if (!user) return unauthorized();
    const db = getDb();
    const rows = await db
      .select()
      .from(events)
      .where(eq(events.ownerId, user.userId))
      .orderBy(desc(events.createdAt));
    const items = await Promise.all(
      rows.map(async (event) => {
        const snapshot = await getEventSnapshot(event.id, true);
        return {
          ...snapshot?.event,
          categoryCount: snapshot?.categories.length ?? 0,
          submissionCount: snapshot?.submissions.length ?? 0,
        };
      }),
    );
    return Response.json({ events: items });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAdminUser();
    if (!user) return unauthorized();
    const payload = (await request.json()) as {
      title?: string;
      eventDate?: string;
      location?: string;
      categories?: Array<{ title?: string; prompt?: string; icon?: string }>;
    };
    const title = payload.title?.trim();
    if (!title) {
      return Response.json({ error: "Give your event a name." }, { status: 400 });
    }

    const eventId = crypto.randomUUID();
    const code = createCode();
    const db = getDb();
    await db.insert(events).values({
      id: eventId,
      ownerId: user.userId,
      code,
      title: title.slice(0, 90),
      eventDate: payload.eventDate || null,
      location: payload.location?.trim().slice(0, 120) ?? "",
    });

    const requested = payload.categories?.filter((item) => item.title?.trim());
    const categoryList = requested?.length ? requested : defaultCategories;
    await db.insert(categories).values(
      categoryList.slice(0, 12).map((category, index) => ({
        id: crypto.randomUUID(),
        eventId,
        title: category.title!.trim().slice(0, 60),
        prompt: category.prompt?.trim().slice(0, 180) ?? "",
        icon: category.icon ?? defaultCategories[index % defaultCategories.length].icon,
        sortOrder: index,
      })),
    );

    const snapshot = await getEventSnapshot(eventId, true);
    return Response.json(snapshot, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

