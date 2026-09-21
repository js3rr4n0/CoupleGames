import Landing from "@/components/Landing";
import { GAME_LIST } from "@/lib/games/registry";

export default function Home() {
  // El catálogo se arma en el servidor: la interfaz solo recibe datos planos.
  return <Landing games={GAME_LIST} />;
}
