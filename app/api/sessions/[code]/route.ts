import type { NextRequest } from "next/server";
import {
  chooseCharacter,
  clearOptions,
  GameError,
  offerOptions,
  swapCharacter,
  joinSession,
  nextRound,
  passRound,
  rematch,
  requirePlayer,
  revealHint,
  startGame,
  askQuestion,
  submitAnswer,
  submitGuess,
  syncClock,
  updateSettings,
} from "@/lib/game";
import { flushSessions, loadSession, saveSession } from "@/lib/store";
import { buildView } from "@/lib/view";
import type { AnswerValue, CategoryId } from "@/lib/types";

interface ActionBody {
  action?: string;
  playerId?: string;
  name?: string;
  value?: AnswerValue;
  text?: string;
  questionId?: string;
  characterId?: string;
  categories?: CategoryId[];
  roundSeconds?: number;
  roundsPerPlayer?: number;
  targetPlayers?: number;
}

function fail(error: unknown) {
  const status = error instanceof GameError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "Algo salió mal, inténtalo otra vez.";
  return Response.json({ error: message }, { status });
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/sessions/[code]">,
) {
  const { code } = await ctx.params;
  const session = await loadSession(code);
  if (!session) return Response.json({ error: "Sala no encontrada" }, { status: 404 });

  const playerId = request.nextUrl.searchParams.get("playerId");
  syncClock(session);
  if (playerId) {
    const player = session.players.find((p) => p.id === playerId);
    if (player) player.lastSeen = Date.now();
  }
  await flushSessions();
  return Response.json({ view: buildView(session, playerId) });
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/sessions/[code]">,
) {
  const { code } = await ctx.params;
  const session = await loadSession(code);
  if (!session) return Response.json({ error: "Sala no encontrada" }, { status: 404 });

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return Response.json({ error: "Petición inválida" }, { status: 400 });
  }

  try {
    syncClock(session);

    if (body.action === "join") {
      const player = joinSession(session, body.name ?? "");
      await flushSessions();
      return Response.json({
        playerId: player.id,
        view: buildView(session, player.id),
      });
    }

    const player = requirePlayer(session, body.playerId ?? "");
    player.lastSeen = Date.now();
    let extra: Record<string, unknown> = {};

    switch (body.action) {
      case "settings":
        updateSettings(session, player, {
          categories: body.categories,
          roundSeconds: body.roundSeconds,
          roundsPerPlayer: body.roundsPerPlayer,
          targetPlayers: body.targetPlayers,
        });
        break;
      case "start":
        await startGame(session, player);
        break;
      case "ask":
        askQuestion(session, player, body.text ?? "");
        break;
      case "answer":
        submitAnswer(session, player, body.value ?? "quiza", body.questionId);
        break;
      case "guess":
        extra = submitGuess(session, player, body.text ?? "");
        break;
      case "hint":
        revealHint(session, player);
        break;
      case "swap":
        await swapCharacter(session, player, body.categories?.[0]);
        break;
      case "options":
        await offerOptions(session, player, body.categories?.[0]);
        break;
      case "choose":
        chooseCharacter(session, player, body.characterId ?? "");
        break;
      case "cancel-options":
        clearOptions(session, player);
        break;
      case "pass":
        passRound(session, player);
        break;
      case "next":
        nextRound(session);
        break;
      case "rematch":
        rematch(session, player);
        break;
      case "ping":
        saveSession(session);
        break;
      default:
        return Response.json({ error: "Acción desconocida" }, { status: 400 });
    }

    await flushSessions();
    return Response.json({ ...extra, view: buildView(session, player.id) });
  } catch (error) {
    return fail(error);
  }
}
