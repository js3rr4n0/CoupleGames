import type { NextRequest } from "next/server";
import { loadSession } from "@/lib/store";
import { loadRoom } from "@/lib/engine/store";

/** Un mismo código puede ser de «¿Quién soy?» o de una mesa: aquí se decide. */
export async function GET(request: NextRequest) {
  const code = (request.nextUrl.searchParams.get("code") ?? "").toUpperCase();
  if (await loadSession(code))
    return Response.json({ kind: "quien-soy", path: `/s/${code}` });
  const room = await loadRoom(code);
  if (room) return Response.json({ kind: room.gameId, path: `/mesa/${code}` });
  return Response.json({ error: "No encontramos esa sala" }, { status: 404 });
}
