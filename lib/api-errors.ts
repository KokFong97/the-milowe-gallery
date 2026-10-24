export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error(error);
  return Response.json({ error: message }, { status: 500 });
}

export function unauthorized() {
  return Response.json({ error: "Sign in as an organizer to continue." }, { status: 401 });
}
