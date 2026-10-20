"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Голограмма агента: объёмный «бюст» из светящихся частиц над излучателем.
 * Рот открывается в такт словам (pulse), голова медленно поворачивается,
 * поверх — сканлинии, мерцание и редкие «глитчи».
 */

type Kind = "head" | "eye" | "body" | "neck" | "hair" | "edge" | "ear" | "antenna" | "tip" | "core";
export type Persona = "female" | "male" | "robot";
interface P {
  x: number;
  y: number;
  z: number;
  kind: Kind;
  side?: number;
}

/** Причёска: длинные волосы (женский персонаж) или короткая стрижка (мужской) */
function buildHair(persona: Persona): P[] {
  const pts: P[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const N = persona === "female" ? 420 : 360;
  const scale = persona === "female" ? 1.08 : 1.05;
  for (let i = 0; i < N; i++) {
    const ny = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - ny * ny);
    const th = golden * i;
    const nx = Math.cos(th) * r;
    const nz = Math.sin(th) * r;
    // Лицо открыто: волосы сверху, сзади и по бокам
    const cover = persona === "female" ? ny < -0.55 || nz < 0.3 : ny < -0.5 || (nz < -0.15 && ny < 0.15);
    if (!cover) continue;
    pts.push({ x: nx * 0.36 * scale, y: -0.62 + ny * 0.44 * scale, z: nz * 0.38 * scale, kind: "hair" });
  }
  if (persona === "female") {
    // Длинные пряди до плеч: «юбка» волос сзади и по бокам (θ от 160° до 380°, через затылок)
    for (let s = 0; s < 34; s++) {
      const th = ((160 + (s / 33) * 220) * Math.PI) / 180;
      const len = 0.72 + 0.08 * Math.sin(s * 1.7);
      for (let k = 0; k < 15; k++) {
        const t = k / 14;
        const y = -0.62 + t * len;
        const rx = 0.4 + 0.07 * t;
        const rz = 0.37 + 0.05 * t;
        pts.push({ x: Math.cos(th) * rx, y, z: Math.sin(th) * rz, kind: "hair", side: s });
      }
    }
  }
  return pts;
}

function buildModel(persona: Persona): P[] {
  const pts: P[] = [];
  const shoulders = persona === "male" ? 1.1 : 0.9;
  const neckR = persona === "male" ? 0.13 : 0.1;
  // Голова — сфера Фибоначчи, слегка вытянутая по вертикали
  const N = 520;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    pts.push({ x: Math.cos(th) * r * 0.36, y: -0.62 + y * 0.44, z: Math.sin(th) * r * 0.38, kind: "head" });
  }
  // Глаза
  for (const side of [-1, 1]) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      pts.push({ x: side * 0.13 + Math.cos(a) * 0.035, y: -0.66 + Math.sin(a) * 0.016, z: 0.33, kind: "eye", side });
    }
  }
  // Шея
  for (let i = 0; i < 70; i++) {
    const a = (i / 14) * Math.PI * 2;
    const h = (i % 5) / 4;
    pts.push({ x: Math.cos(a) * neckR, y: -0.2 + h * 0.16, z: Math.sin(a) * neckR, kind: "neck" });
  }
  // Плечи и грудь — «силуэт» из колец, расширяющихся книзу
  const rows = 16;
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    const y = -0.04 + t * 0.62;
    const rx = (0.2 + 0.5 * Math.min(1, t * 2.4) - 0.04 * t) * shoulders;
    const rz = 0.16 + 0.12 * Math.min(1, t * 2);
    const count = Math.round(34 + 30 * t);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      pts.push({ x: Math.cos(a) * rx, y, z: Math.sin(a) * rz, kind: "body" });
    }
  }
  return [...pts, ...buildHair(persona)];
}

/** Точки на гранях прямоугольного блока; рёбра — отдельным, более ярким типом */
function boxPoints(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, step: number, face: Kind, skipFront?: (x: number, y: number) => boolean): P[] {
  const pts: P[] = [];
  const range = (a: number, b: number) => {
    const out: number[] = [];
    const n = Math.max(1, Math.round((b - a) / step));
    for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n);
    return out;
  };
  const xs = range(-hx, hx);
  const ys = range(-hy, hy);
  const zs = range(-hz, hz);
  const isEdge = (a: number, ha: number) => Math.abs(Math.abs(a) - ha) < 1e-6;
  for (const x of xs)
    for (const y of ys) {
      const edge = isEdge(x, hx) || isEdge(y, hy);
      if (!skipFront?.(cx + x, cy + y)) pts.push({ x: cx + x, y: cy + y, z: cz + hz, kind: edge ? "edge" : face });
      pts.push({ x: cx + x, y: cy + y, z: cz - hz, kind: edge ? "edge" : face });
    }
  for (const z of zs)
    for (const y of ys) {
      const edge = isEdge(z, hz) || isEdge(y, hy);
      pts.push({ x: cx + hx, y: cy + y, z: cz + z, kind: edge ? "edge" : face });
      pts.push({ x: cx - hx, y: cy + y, z: cz + z, kind: edge ? "edge" : face });
    }
  for (const x of xs)
    for (const z of zs) {
      const edge = isEdge(x, hx) || isEdge(z, hz);
      pts.push({ x: cx + x, y: cy - hy, z: cz + z, kind: edge ? "edge" : face });
      pts.push({ x: cx + x, y: cy + hy, z: cz + z, kind: edge ? "edge" : face });
    }
  return pts;
}

/** Робот: голова-шлем с визором и LED-глазами, антенна, «уши»-диски, корпус со светящимся ядром */
function buildRobot(): P[] {
  const pts: P[] = [];
  const headY = -0.62;
  const HX = 0.3;
  const HY = 0.26;
  const HZ = 0.25;
  // Голова: лицевую панель внутри визора оставляем «прозрачной»
  const inVisor = (x: number, y: number) => Math.abs(x) < 0.22 && y > headY - 0.12 && y < headY + 0.1;
  pts.push(...boxPoints(0, headY, 0, HX, HY, HZ, 0.045, "head", inVisor));
  // Рамка визора
  for (let i = 0; i <= 44; i++) {
    const u = -0.22 + (i / 44) * 0.44;
    pts.push({ x: u, y: headY - 0.12, z: HZ, kind: "edge" }, { x: u, y: headY + 0.1, z: HZ, kind: "edge" });
  }
  for (let i = 0; i <= 18; i++) {
    const v = headY - 0.12 + (i / 18) * 0.22;
    pts.push({ x: -0.22, y: v, z: HZ, kind: "edge" }, { x: 0.22, y: v, z: HZ, kind: "edge" });
  }
  // LED-глаза: скруглённые прямоугольники
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++)
      for (let j = 0; j < 4; j++) {
        const x = side * 0.105 + (i / 8 - 0.5) * 0.1;
        const y = headY - 0.04 + (j / 3 - 0.5) * 0.045;
        pts.push({ x, y, z: HZ + 0.005, kind: "eye", side });
      }
  }
  // «Уши»-диски по бокам
  for (const side of [-1, 1]) {
    for (let r = 0; r < 3; r++)
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const rad = 0.03 + r * 0.025;
        pts.push({ x: side * (HX + 0.025), y: headY + Math.sin(a) * rad, z: Math.cos(a) * rad, kind: "ear" });
      }
  }
  // Антенна с огоньком
  for (let i = 0; i < 10; i++) pts.push({ x: 0, y: headY - HY - (i / 9) * 0.15, z: 0, kind: "antenna" });
  pts.push({ x: 0, y: headY - HY - 0.18, z: 0, kind: "tip" });
  // Шея — сегменты
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      pts.push({ x: Math.cos(a) * 0.1, y: -0.32 + r * 0.07, z: Math.sin(a) * 0.1, kind: "neck" });
    }
  // Корпус и плечевые шарниры
  pts.push(...boxPoints(0, 0.22, 0, 0.38, 0.34, 0.2, 0.06, "body"));
  for (const side of [-1, 1]) {
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < 90; i++) {
      const y = 1 - (i / 89) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      pts.push({ x: side * 0.5 + Math.cos(th) * r * 0.11, y: -0.04 + y * 0.11, z: Math.sin(th) * r * 0.11, kind: "body" });
    }
  }
  // Светящееся ядро на груди
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const rad = 0.025 + r * 0.03;
      pts.push({ x: Math.cos(a) * rad, y: 0.16 + Math.sin(a) * rad, z: 0.205, kind: "core" });
    }
  return pts;
}

const MODELS: Record<Persona, P[]> = { female: buildModel("female"), male: buildModel("male"), robot: buildRobot() };

export function Hologram({
  speaking,
  pulse = 0,
  active = true,
  height = 300,
  className,
  tone = "cyan",
  persona = "female",
}: {
  /** Женский или мужской персонаж — по выбранному голосу */
  persona?: Persona;
  speaking: boolean;
  /** Увеличивается на каждое произнесённое слово — рот «щёлкает» в такт */
  pulse?: number;
  /** false — голограмма приглушена (линия свободна) */
  active?: boolean;
  height?: number;
  className?: string;
  tone?: "cyan" | "violet";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({ level: 0, speaking, active, glitch: 0 });
  state.current.speaking = speaking;
  state.current.active = active;

  useEffect(() => {
    state.current.level = 1;
  }, [pulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rgb = tone === "cyan" ? [94, 234, 212] : [196, 181, 253];
    const accent = tone === "cyan" ? [56, 189, 248] : [129, 140, 248];
    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let blinkAt = performance.now() + 2500;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      const s = state.current;
      const t = now / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Уровень «голоса»: импульс от слова и плавное затухание
      s.level = Math.max(s.level * 0.88, s.speaking ? 0.18 + 0.12 * Math.sin(t * 11) : 0);
      const power = s.active ? 1 : 0.45;
      const flicker = 0.88 + 0.12 * Math.sin(t * 37) * Math.sin(t * 13);

      // Модель по вертикали занимает от −1.06 до +0.62 единиц — подгоняем под высоту
      const S = Math.min(w * 0.5, h * 0.5);
      const cx = w / 2;
      const cy = h * 0.6;
      const baseY = cy + S * 0.64;

      // Излучатель и световой конус
      ctx.globalCompositeOperation = "lighter";
      const cone = ctx.createLinearGradient(0, baseY, 0, cy - S * 0.9);
      cone.addColorStop(0, `rgba(${accent.join(",")},${0.22 * power})`);
      cone.addColorStop(1, `rgba(${accent.join(",")},0)`);
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(cx - S * 0.32, baseY);
      ctx.lineTo(cx + S * 0.32, baseY);
      ctx.lineTo(cx + S * 0.62, cy - S * 0.95);
      ctx.lineTo(cx - S * 0.62, cy - S * 0.95);
      ctx.closePath();
      ctx.fill();

      for (let i = 3; i >= 1; i--) {
        ctx.strokeStyle = `rgba(${rgb.join(",")},${(0.12 + 0.08 * i) * power * flicker})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(cx, baseY, S * 0.12 * i + S * 0.06, S * 0.025 * i + S * 0.01, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const glow = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, S * 0.45);
      glow.addColorStop(0, `rgba(${rgb.join(",")},${0.35 * power})`);
      glow.addColorStop(1, `rgba(${rgb.join(",")},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(cx, baseY, S * 0.45, S * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();

      // Поворот головы/корпуса
      const yaw = reduce ? 0.2 : Math.sin(t * 0.55) * 0.5 + (s.speaking ? Math.sin(t * 2.1) * 0.05 : 0);
      const pitch = reduce ? 0 : Math.sin(t * 0.37) * 0.07;
      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const blinking = now > blinkAt && now < blinkAt + 140;
      if (now > blinkAt + 140) blinkAt = now + 2500 + Math.random() * 3000;

      const plot = (x: number, y: number, z: number, size: number, alpha: number, color: number[]) => {
        // Вращение по Y, затем лёгкий наклон по X
        const x1 = x * cyaw + z * syaw;
        const z1 = -x * syaw + z * cyaw;
        const y2 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        const f = 2.8 / (2.8 - z2);
        const px = cx + x1 * S * f;
        const py = cy + y2 * S * f;
        const depth = (z2 + 0.6) / 1.2;
        const a = alpha * (0.3 + 0.7 * Math.max(0, Math.min(1, depth))) * power * flicker;
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${a.toFixed(3)})`;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      };

      const ripple = s.level * 0.05;
      const robot = persona === "robot";
      const hairColor = tone === "cyan" ? [165, 243, 252] : [233, 213, 255];
      for (const p of MODELS[persona]) {
        if (p.kind === "hair") {
          // Пряди слегка колышутся
          const sway = p.side !== undefined ? Math.sin(t * 1.6 + p.side * 0.6) * 0.012 * Math.max(0, p.y + 0.62) : 0;
          plot(p.x + sway, p.y, p.z, 1.4, 0.55, hairColor);
        } else if (p.kind === "head") {
          if (robot) {
            plot(p.x, p.y, p.z, 1.3, 0.5, rgb);
          } else {
            // Голосовая «рябь» по поверхности головы
            const k = 1 + ripple * Math.sin(p.y * 28 + t * 14);
            plot(p.x * k, p.y, p.z * k, 1.7, 0.75, rgb);
          }
        } else if (p.kind === "edge") {
          plot(p.x, p.y, p.z, 1.9, 0.95, rgb);
        } else if (p.kind === "eye") {
          if (blinking) continue;
          plot(p.x, p.y, p.z, robot ? 2.6 : 2.3, robot ? 0.75 + s.level * 0.25 : 1, [230, 255, 255]);
        } else if (p.kind === "ear") {
          plot(p.x, p.y, p.z, 1.6, 0.75, accent);
        } else if (p.kind === "antenna") {
          plot(p.x, p.y, p.z, 1.6, 0.85, rgb);
        } else if (p.kind === "tip") {
          // Огонёк антенны пульсирует, когда робот говорит — сильнее
          plot(p.x, p.y, p.z, 4 + 1.5 * Math.sin(t * 4) + s.level * 5, 1, [255, 255, 255]);
        } else if (p.kind === "core") {
          const beat = 0.45 + 0.25 * (0.5 + 0.5 * Math.sin(t * 3)) + s.level * 0.3;
          plot(p.x, p.y, p.z, 2.1, beat, accent);
        } else if (p.kind === "neck") {
          plot(p.x, p.y, p.z, 1.4, 0.45, rgb);
        } else {
          const scan = 0.55 + 0.45 * Math.sin(p.y * 22 - t * 3);
          plot(p.x, p.y, p.z, 1.5, 0.5 * scan, rgb);
        }
      }

      if (robot) {
        // Рот робота — эквалайзер: столбики «прыгают» в такт речи
        for (let i = 0; i < 9; i++) {
          const x = -0.12 + (i / 8) * 0.24;
          const h = 0.006 + s.level * (0.025 + 0.03 * Math.abs(Math.sin(t * 17 + i * 1.7)));
          for (let y = -h; y <= h + 1e-6; y += 0.008) plot(x, -0.45 + y, 0.255, 2, 0.95, [220, 255, 250]);
        }
      } else {
        // Рот: открывается по уровню голоса
        const open = 0.004 + s.level * 0.07;
        for (let i = 0; i <= 18; i++) {
          const u = i / 18 - 0.5;
          const x = u * 0.2;
          const curve = 1 - (u * 2) ** 2;
          plot(x, -0.47 - open * 0.25 * curve, 0.34, 2, 1, [220, 255, 250]);
          plot(x, -0.47 + open * curve, 0.34, 2, 1, [220, 255, 250]);
        }
      }

      // Орбитальные кольца вокруг головы
      ctx.lineWidth = 1;
      for (let r = 0; r < 2; r++) {
        const ang = t * (r ? -0.6 : 0.45) + r;
        ctx.strokeStyle = `rgba(${accent.join(",")},${0.28 * power})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy - S * 0.62, S * (0.58 + r * 0.12), S * (0.1 + r * 0.03), r ? -0.25 : 0.18, ang, ang + Math.PI * 1.35);
        ctx.stroke();
        const dotA = ang + Math.PI * 1.35;
        const rx = S * (0.58 + r * 0.12);
        const ry = S * (0.1 + r * 0.03);
        const rot = r ? -0.25 : 0.18;
        const dx = rx * Math.cos(dotA);
        const dy = ry * Math.sin(dotA);
        ctx.fillStyle = `rgba(255,255,255,${0.8 * power})`;
        ctx.beginPath();
        ctx.arc(cx + dx * Math.cos(rot) - dy * Math.sin(rot), cy - S * 0.62 + dx * Math.sin(rot) + dy * Math.cos(rot), 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Сканлинии: «вырезаем» тонкие полосы из изображения
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.38)";
      const off = (t * 30) % 4;
      for (let y = off; y < h; y += 4) ctx.fillRect(0, y, w, 1.4);

      // Редкий глитч — горизонтальный сдвиг полосы
      ctx.globalCompositeOperation = "source-over";
      if (!reduce && (s.glitch > 0 || Math.random() < (s.speaking ? 0.012 : 0.005))) {
        s.glitch = s.glitch > 0 ? s.glitch - 1 : 4;
        const gy = Math.random() * h * 0.8;
        const gh = 6 + Math.random() * 18;
        const shift = (Math.random() - 0.5) * 16;
        ctx.drawImage(canvas, 0, gy * dpr, canvas.width, gh * dpr, shift, gy, w, gh);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [tone, persona]);

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl", className)}
      style={{
        height,
        background:
          "radial-gradient(ellipse at 50% 85%, rgba(56,189,248,.18), transparent 55%), radial-gradient(ellipse at 50% 20%, rgba(139,92,246,.18), transparent 60%), linear-gradient(180deg, #050816 0%, #0a1024 100%)",
      }}
    >
      {/* Сетка «пола» голопроектора */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-40"
        style={{
          backgroundImage: "linear-gradient(rgba(94,234,212,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,.25) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          transform: "perspective(240px) rotateX(58deg)",
          transformOrigin: "bottom",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="Голограмма ИИ-агента" role="img" />
    </div>
  );
}
