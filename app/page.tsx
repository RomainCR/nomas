import Character from "@/components/Character";
import IserePoint from "@/components/IserePoint";
import Logo from "@/components/Logo";

export default function Page() {
  return (
    <main className="stage">
      <h1 className="logo">
        <Logo />
      </h1>

      <Character className="figure" />

      <div className="credit">
        <p>11—14 JUIN 2027</p>
        <p>[ ISÈRE ]</p>
      </div>

      <IserePoint />
    </main>
  );
}
