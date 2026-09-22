import type { NextRequest } from "next/server";
import { GameError } from "@/lib/game";
import {
  addBot,
  joinRoom,
  removeBot,
  playAction,
  rematch,
  requireRoomPlayer,
  startGame,
  writePad,
} from "@/lib/engine/room";
import { flushRooms, loadRoom, saveRoom } from "@/lib/engine/store";
import { runBots } from "@/lib/engine/bots";
import { buildRoomView } from "@/lib/engine/view";

interface Body {
  action?: string;
  playerId?: string;
  name?: string;
  botId?: string;
  move?: Record<string, unknown>;
  text?: string;
  mark?: { key: string; value: string };
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/rooms/[code]">,
) {
  const { code } = await ctx.params;
  const room = await loadRoom(code);
  if (!room) return Response.json({ error: "Mesa no encontrada" }, { status: 404 });

  const playerId = request.nextUrl.searchParams.get("playerId");
  if (playerId) {
    const player = room.players.find((p) => p.id === playerId);
    if (player) player.lastSeen = Date.now();
  }
  // Los robots juegan al ritmo de las peticiones: sin temporizadores.
  if (runBots(room)) saveRoom(room);
  await flushRooms();
  return Response.json({ view: buildRoomView(room, playerId) });
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/rooms/[code]">,
) {
  const { code } = await ctx.params;
  const room = await loadRoom(code);
  if (!room) return Response.json({ error: "Mesa no encontrada" }, { status: 404 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  try {
    if (body.action === "join") {
      const player = joinRoom(room, body.name ?? "");
      await flushRooms();
      return Response.json({
        playerId: player.id,
        view: buildRoomView(room, player.id),
      });
    }

    const player = requireRoomPlayer(room, body.playerId ?? "");
    player.lastSeen = Date.now();

    switch (body.action) {
      case "start":
        startGame(room, player);
        break;
      case "play":
        playAction(room, player, {
          type: String(body.move?.type ?? ""),
          ...(body.move ?? {}),
        });
        break;
      case "rematch":
        rematch(room, player);
        break;
      case "add-bot":
        addBot(room, player);
        break;
      case "remove-bot":
        removeBot(room, player, body.botId);
        break;
      case "pad":
        writePad(room, player, body.text, body.mark);
        break;
      case "ping":
        saveRoom(room);
        break;
      default:
        return Response.json({ error: "Acción desconocida" }, { status: 400 });
    }

    if (runBots(room)) saveRoom(room);
    await flushRooms();
    return Response.json({ view: buildRoomView(room, player.id) });
  } catch (error) {
    const status = error instanceof GameError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Algo salió mal.";
    return Response.json({ error: message }, { status });
  }
}
