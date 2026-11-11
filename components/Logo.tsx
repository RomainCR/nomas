import { TITLE } from "@/lib/artwork";

export default function Logo() {
  return (
    <svg
      viewBox={`0 0 ${TITLE.width} ${TITLE.height}`}
      role="img"
      aria-label="Nomas"
      fill="currentColor"
    >
      <path d={TITLE.d} fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}
