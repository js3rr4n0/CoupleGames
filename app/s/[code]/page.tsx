import Room from "@/components/Room";

export const metadata = {
  title: "Sala · ¿Quién soy?",
};

export default async function SessionPage(props: PageProps<"/s/[code]">) {
  const { code } = await props.params;
  return <Room code={code.toUpperCase()} />;
}
