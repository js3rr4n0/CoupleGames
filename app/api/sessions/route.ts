import { createSession, GameError } from "@/lib/game";
import { sweep } from "@/lib/store";
import { buildView } from "@/lib/view";

export async function POST(request: Request) {
  try {
    sweep();
    const body = (await request.json()) as { name?: string; players?: number };
    const { session, player } = createSession(
      body.name ?? "",
      Number(body.players ?? 2),
    );
    return Response.json({
      code: session.code,
      playerId: player.id,
      view: buildView(session, player.id),
    });
  } catch (error) {
    const status = error instanceof GameError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "No pudimos crear la sala.";
    return Response.json({ error: message }, { status });
  }
}
