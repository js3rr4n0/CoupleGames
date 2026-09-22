import { GameError } from "@/lib/game";
import { createRoom } from "@/lib/engine/room";
import { flushRooms, roomExists, sweepRooms } from "@/lib/engine/store";
import { newUniqueCode, sessionExists } from "@/lib/store";
import { buildRoomView } from "@/lib/engine/view";
import { isGameId } from "@/lib/games/registry";

export async function POST(request: Request) {
  try {
    sweepRooms();
    const body = (await request.json()) as {
      gameId?: string;
      name?: string;
      players?: number;
    };
    if (!body.gameId || !isGameId(body.gameId))
      throw new GameError("Ese juego no existe.", 404);
    const code = await newUniqueCode(
      async (candidate) =>
        (await roomExists(candidate)) || (await sessionExists(candidate)),
    );
    const { room, player } = createRoom(
      body.gameId,
      body.name ?? "",
      Number(body.players ?? 2),
      code,
    );
    await flushRooms();
    return Response.json({
      code: room.code,
      playerId: player.id,
      view: buildRoomView(room, player.id),
    });
  } catch (error) {
    const status = error instanceof GameError ? error.status : 500;
    const message = error instanceof Error ? error.message : "No pudimos crear la mesa.";
    return Response.json({ error: message }, { status });
  }
}
