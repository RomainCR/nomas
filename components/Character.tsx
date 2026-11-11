"use client";

import { useEffect, useRef } from "react";
import { FACE_D, FIGURE } from "@/lib/artwork";

/**
 * The squiggly character.
 *
 * The outline is a closed centre-line extracted from the reference artwork.
 * It is drawn as a single marker stroke, with a touch of static roughness, and
 * it reacts locally: as the pointer sweeps over it, the points near the cursor
 * are dragged along and then spring back, so only the part of the line the
 * pointer passed over starts to wiggle.
 */

type Geometry = {
  px: Float32Array;
  py: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  baseX: Float32Array;
  baseY: Float32Array;
};

function makeGeometry(): Geometry {
  const pts = FIGURE.points;
  const n = pts.length;
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const nx = new Float32Array(n);
  const ny = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    px[i] = pts[i][0];
    py[i] = pts[i][1];
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    nx[i] = -ty;
    ny[i] = tx;
  }

  // Static hand-drawn roughness so the line never looks vector-perfect.
  const rough = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    rough[i] =
      0.6 * Math.sin(i * 0.91 + 0.4) +
      0.42 * Math.sin(i * 0.33 + 2.1) +
      0.3 * Math.sin(i * 2.27 + 1.1) +
      0.22 * Math.sin(i * 3.7 + 0.9);
  }

  const baseX = new Float32Array(n);
  const baseY = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    baseX[i] = px[i] + nx[i] * rough[i];
    baseY[i] = py[i] + ny[i] * rough[i];
  }

  return { px, py, nx, ny, baseX, baseY };
}

const GEOMETRY = makeGeometry();

/** True if the (x, y) point in figure coordinates lies inside the outline. */
function isInsideCharacter(x: number, y: number): boolean {
  const g = GEOMETRY;
  const n = g.baseX.length;
  let inside = false;
  for (let i = n - 1, j = 0; i >= 0; j = i--) {
    const xi = g.baseX[i];
    const yi = g.baseY[i];
    const xj = g.baseX[j];
    const yj = g.baseY[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function buildPath(
  geometry: Geometry,
  offX?: Float32Array,
  offY?: Float32Array,
): string {
  const { baseX, baseY } = geometry;
  const n = baseX.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = Math.round((baseX[i] + (offX ? offX[i] : 0)) * 10) / 10;
    const y = Math.round((baseY[i] + (offY ? offY[i] : 0)) * 10) / 10;
    d += (i === 0 ? "M" : "L") + x + " " + y;
  }
  return d + "Z";
}

/** Rendered on the server too, so the poster is complete without JavaScript. */
const RESTING_D = buildPath(GEOMETRY);

export default function Character({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const outlineRef = useRef<SVGPathElement | null>(null);
  const faceRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const outline = outlineRef.current;
    const face = faceRef.current;
    if (!svg || !outline || !face) return;

    const { px, py } = GEOMETRY;
    const n = px.length;

    // Per-point spring offsets.
    const offX = new Float32Array(n);
    const offY = new Float32Array(n);
    const velX = new Float32Array(n);
    const velY = new Float32Array(n);

    // Tuning (all distances in viewBox units, 1 unit ≈ 1px of the 720px artwork).
    const RADIUS = 120;
    const RADIUS2 = RADIUS * RADIUS;
    const STIFFNESS = 0.15;
    const DAMPING = 0.4;
    const DRAG = 0.062;
    const TOUCH_DRAG = 0.18;
    const PUSH = 0.45;
    const POKE = 16;
    const MAX_VEL = 16;

    // Face marks follow the head outline very slightly.
    let faceIndex = 0;
    let faceBest = Infinity;
    for (let i = 0; i < n; i++) {
      const d = (px[i] - 322) ** 2 + (py[i] - 55) ** 2;
      if (d < faceBest) {
        faceBest = d;
        faceIndex = i;
      }
    }

    // Music: a press on the character plays the track; it starts fading out
    // (10 seconds) before the end of the track.
    const audio = new Audio(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/media.mp4`,
    );
    (window as unknown as Record<string, unknown>).__nomasAudio = audio;
    audio.volume = 1;

    const FADE_SECONDS = 20;
    let fading = false;
    let fadeRaf = 0;
    let musicActive = false;

    const stopFade = () => {
      if (fadeRaf) cancelAnimationFrame(fadeRaf);
      fadeRaf = 0;
      fading = false;
      musicActive = false;
      offX.fill(0);
      offY.fill(0);
      velX.fill(0);
      velY.fill(0);
    };

    const beginFade = () => {
      if (fading) return;
      fading = true;
      const startedAt = performance.now();
      const fade = () => {
        const t = (performance.now() - startedAt) / 1000;
        const v = Math.max(0, audio.volume * (1 - t / FADE_SECONDS));
        audio.volume = v;
        if (t < FADE_SECONDS) {
          fadeRaf = requestAnimationFrame(fade);
        } else {
          audio.pause();
          audio.currentTime = 0;
          stopFade();
        }
      };
      fadeRaf = requestAnimationFrame(fade);
    };

    const scheduleFade = () => {
      if (fadeRaf) return;
      const tick = () => {
        const dur = audio.duration;
        if (
          !Number.isNaN(dur) &&
          audio.currentTime >= Math.max(0, dur - FADE_SECONDS) &&
          !fading
        ) {
          beginFade();
          return;
        }
        fadeRaf = requestAnimationFrame(tick);
      };
      fadeRaf = requestAnimationFrame(tick);
    };

    const playCharacterSound = () => {
      if (!isInsideCharacter(pointerX, pointerY)) return;
      if (audio.paused) {
        audio.currentTime = 0;
        audio.volume = 1;
        // The movement that goes with the music starts on the same press.
        poke = true;
        musicActive = true;
        void audio.play().catch(() => {});
        scheduleFade();
      } else {
        // Click again while the music is playing -> stop the sound.
        stopFade();
        musicActive = false;
        offX.fill(0);
        offY.fill(0);
        velX.fill(0);
        velY.fill(0);
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
      }
    };

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    outline.setAttribute("d", RESTING_D);

    let pointerX = 0;
    let pointerY = 0;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let hasPointer = false;
    let poke = false;
    let isTouch = false;
    let running = false;
    let lastTime = 0;
    let raf = 0;

    const toLocal = (event: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width) * FIGURE.width;
      pointerY = ((event.clientY - rect.top) / rect.height) * FIGURE.height;
      if (!hasPointer) {
        prevPointerX = pointerX;
        prevPointerY = pointerY;
        hasPointer = true;
      }
    };

    const frame = (now: number) => {
      const dt = lastTime
        ? Math.min(2.2, Math.max(0.2, (now - lastTime) / 16.667))
        : 1;
      lastTime = now;

      // Pointer travel since the previous frame, expressed in units/frame.
      let pvx = 0;
      let pvy = 0;
      if (hasPointer) {
        pvx = (pointerX - prevPointerX) / dt;
        pvy = (pointerY - prevPointerY) / dt;
        prevPointerX = pointerX;
        prevPointerY = pointerY;
      }

      const speed = Math.hypot(pvx, pvy);
      // A press or tap should react even before it moves.
      const poking = poke;
      poke = false;
      const stirring = speed > 0.25 || poking;
      let energy = speed;
      const drag = isTouch ? TOUCH_DRAG : DRAG;

      for (let i = 0; i < n; i++) {
        // Spring back towards the resting position.
        const ax = (-STIFFNESS * offX[i] - DAMPING * velX[i]) * dt;
        const ay = (-STIFFNESS * offY[i] - DAMPING * velY[i]) * dt;

        if (stirring) {
          const dx = px[i] - pointerX;
          const dy = py[i] - pointerY;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < RADIUS2) {
            let f = 1 - Math.sqrt(dist2) / RADIUS;
            f *= f;
            velX[i] += pvx * drag * f;
            velY[i] += pvy * drag * f;
            const dist = Math.sqrt(dist2) || 1;
            const push = poking ? POKE * f : PUSH * f * Math.min(1, speed / 8);
            velX[i] += (dx / dist) * push;
            velY[i] += (dy / dist) * push;
          }
        }

        // Semi-implicit Euler, with a hard speed cap.
        let vx = velX[i] + ax;
        let vy = velY[i] + ay;
        if (vx > MAX_VEL) vx = MAX_VEL;
        else if (vx < -MAX_VEL) vx = -MAX_VEL;
        if (vy > MAX_VEL) vy = MAX_VEL;
        else if (vy < -MAX_VEL) vy = -MAX_VEL;
        velX[i] = vx;
        velY[i] = vy;
        offX[i] += vx * dt;
        offY[i] += vy * dt;

        const e =
          Math.abs(vx) + Math.abs(vy) + Math.abs(offX[i]) + Math.abs(offY[i]);
        if (e > energy) energy = e;
      }

      // Gentle floating while the music is playing (fades with the music).
      const idleAmp = musicActive && audio.volume > 0 ? 2.5 * audio.volume : 0;
      console.log("\n \n 🚀 ~ frame ~ idleAmp:", idleAmp);
      console.log("\n \n 🚀 ~ frame ~ audio.volume:", audio.volume);
      if (idleAmp > 0) {
        const ph = now * 0.0032;
        for (let i = 0; i < n; i++) {
          offX[i] = Math.cos(ph + i * 1.3) * idleAmp;
          offY[i] = Math.sin(ph * 1.7 + i * 2.1) * idleAmp;
          velX[i] = 0;
          velY[i] = 0;
        }
      }

      outline.setAttribute("d", buildPath(GEOMETRY, offX, offY));

      const fx = (offX[faceIndex] * 0.55).toFixed(2);
      const fy = (offY[faceIndex] * 0.55).toFixed(2);
      face.setAttribute("transform", `translate(${fx} ${fy})`);

      if (energy > 0.02) {
        raf = requestAnimationFrame(frame);
      } else {
        // Fully settled: snap back and stop the loop.
        offX.fill(0);
        offY.fill(0);
        velX.fill(0);
        velY.fill(0);
        outline.setAttribute("d", RESTING_D);
        face.setAttribute("transform", "translate(0 0)");
        running = false;
        lastTime = 0;
      }
    };

    const schedule = () => {
      if (running) return;
      running = true;
      lastTime = 0;
      raf = requestAnimationFrame(frame);
    };

    const onPointerMove = (event: PointerEvent) => {
      isTouch = event.pointerType === "touch";
      toLocal(event);
      schedule();
    };

    const onPointerDown = (event: PointerEvent) => {
      isTouch = event.pointerType === "touch";
      toLocal(event);
      // A new contact is a poke at this spot, not a pointer teleport.
      prevPointerX = pointerX;
      prevPointerY = pointerY;
      poke = true;
      playCharacterSound();
      schedule();
    };

    const onPointerUp = (event: PointerEvent) => {
      // Touch pointers only exist while the finger is down.
      if (event.pointerType === "touch") hasPointer = false;
    };

    const onLeave = () => {
      hasPointer = false;
      schedule();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    window.addEventListener("blur", onLeave);
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={`0 0 ${FIGURE.width} ${FIGURE.height}`}
      aria-hidden="true"
      focusable="false">
      <g ref={faceRef} className="face">
        <path d={FACE_D} fillRule="evenodd" clipRule="evenodd" />
      </g>
      <path ref={outlineRef} className="outline" d={RESTING_D} />
    </svg>
  );
}
