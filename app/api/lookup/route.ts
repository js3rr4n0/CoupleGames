import type { NextRequest } from "next/server";
import { getSession } from "@/lib/store";
import { getRoom } from "@/lib/engine/store";

/** Un mismo código puede ser de «¿Quién soy?» o de una mesa: aquí se decide. */
export async function GET(request: NextRequest) {
  const code = (request.nextUrl.searchParams.get("code") ?? "").toUpperCase();
  if (getSession(code)) return Response.json({ kind: "quien-soy", path: `/s/${code}` });
  const room = getRoom(code);
  if (room) return Response.json({ kind: room.gameId, path: `/mesa/${code}` });
  return Response.json({ error: "No encontramos esa sala" }, { status: 404 });
}
