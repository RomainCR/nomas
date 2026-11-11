"use client";

import { useState } from "react";

/**
 * The ISÈRE point illustration, floating under the `[ ISÈRE ]` credit.
 * Shown on hover over the credit, or on touch.
 */
export default function IserePoint() {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`iserepoint-hit${hovered ? " visible" : ""}`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <img
        className="iserepoint"
        src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/iserepoint.png`}
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}
