import Mesa from "@/components/Mesa";

export const metadata = { title: "Mesa · CoupleGames" };

export default async function MesaPage(props: PageProps<"/mesa/[code]">) {
  const { code } = await props.params;
  return <Mesa code={code.toUpperCase()} />;
}
