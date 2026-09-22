"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Sonidos de mesa sintetizados con WebAudio.
 *
 * No hay ni un solo archivo de audio: cada efecto se fabrica en el momento con
 * osciladores y ruido blanco. Así no hay descargas, ni licencias, ni un segundo
 * de espera la primera vez que alguien tira los dados.
 */

export type Sfx =
  | "dado"        // los dados dando tumbos
  | "dadoCae"     // el golpe seco al pararse
  | "ficha"       // la ficha saltando de casilla en casilla
  | "carta"       // una carta que se posa en el montón
  | "reparte"     // el repartidor soltando cartas
  | "roba"        // sacar una carta del mazo
  | "moneda"      // cobrar
  | "pago"        // pagar
  | "compra"      // escritura de propiedad
  | "sobre"       // abrir una carta de Suerte o Caja
  | "toc"         // marcar algo en la libreta
  | "uno"         // ¡UNO!
  | "error"
  | "turno"
  | "victoria";

const STORAGE_KEY = "couplegames:sonido";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted: boolean | null = null;
const listeners = new Set<(muted: boolean) => void>();

export function isMuted(): boolean {
  if (muted === null) {
    try {
      muted = window.localStorage.getItem(STORAGE_KEY) === "off";
    } catch {
      muted = false;
    }
  }
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "off" : "on");
  } catch {
    /* modo privado */
  }
  for (const listener of listeners) listener(value);
  if (!value) void play("toc");
}

export function onMuteChange(listener: (muted: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

function noise(context: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const length = Math.floor(context.sampleRate * 0.6);
    noiseBuffer = context.createBuffer(1, length, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

interface ToneOptions {
  freq: number;
  /** Frecuencia final, si el tono debe subir o bajar. */
  to?: number;
  type?: OscillatorType;
  at?: number;
  dur?: number;
  gain?: number;
}

function tone(context: AudioContext, options: ToneOptions): void {
  const { freq, to, type = "sine", at = 0, dur = 0.12, gain = 0.25 } = options;
  const start = context.currentTime + at;
  const osc = context.createOscillator();
  const env = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), start + dur);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.012, dur / 3));
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(env).connect(master!);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

interface HissOptions {
  at?: number;
  dur?: number;
  gain?: number;
  freq?: number;
  q?: number;
  type?: BiquadFilterType;
}

function hiss(context: AudioContext, options: HissOptions = {}): void {
  const { at = 0, dur = 0.09, gain = 0.2, freq = 2200, q = 0.8, type = "bandpass" } = options;
  const start = context.currentTime + at;
  const source = context.createBufferSource();
  source.buffer = noise(context);
  source.playbackRate.value = 0.8 + Math.random() * 0.5;
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = context.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  source.connect(filter).connect(env).connect(master!);
  source.start(start);
  source.stop(start + dur + 0.02);
}

/** Toca un efecto. Si el navegador no deja sonar todavía, no pasa nada. */
export function play(name: Sfx): void {
  if (isMuted()) return;
  const context = audio();
  if (!context || !master) return;

  switch (name) {
    case "dado": {
      // Cinco golpecitos secos de madera contra la mesa, cada vez más juntos.
      for (let i = 0; i < 5; i++) {
        const at = i * (0.085 - i * 0.008);
        hiss(context, { at, dur: 0.05, gain: 0.16, freq: 1400 + Math.random() * 900, q: 1.4 });
        tone(context, { freq: 150 + Math.random() * 90, to: 90, type: "triangle", at, dur: 0.06, gain: 0.12 });
      }
      break;
    }
    case "dadoCae":
      hiss(context, { dur: 0.08, gain: 0.22, freq: 900, q: 1 });
      tone(context, { freq: 190, to: 70, type: "triangle", dur: 0.14, gain: 0.2 });
      break;
    case "ficha":
      tone(context, { freq: 520, to: 880, type: "sine", dur: 0.09, gain: 0.14 });
      break;
    case "carta":
      hiss(context, { dur: 0.11, gain: 0.26, freq: 1700, q: 0.6, type: "highpass" });
      tone(context, { freq: 320, to: 160, type: "triangle", dur: 0.08, gain: 0.1 });
      break;
    case "reparte":
      for (let i = 0; i < 3; i++)
        hiss(context, { at: i * 0.1, dur: 0.1, gain: 0.2, freq: 1900, q: 0.6, type: "highpass" });
      break;
    case "roba":
      hiss(context, { dur: 0.16, gain: 0.18, freq: 1200, q: 0.5, type: "highpass" });
      break;
    case "moneda":
      tone(context, { freq: 1180, type: "triangle", dur: 0.1, gain: 0.18 });
      tone(context, { freq: 1760, type: "triangle", at: 0.05, dur: 0.16, gain: 0.14 });
      tone(context, { freq: 2340, type: "sine", at: 0.1, dur: 0.2, gain: 0.08 });
      break;
    case "pago":
      tone(context, { freq: 740, to: 300, type: "square", dur: 0.16, gain: 0.12 });
      tone(context, { freq: 300, to: 180, type: "triangle", at: 0.1, dur: 0.22, gain: 0.14 });
      break;
    case "compra":
      tone(context, { freq: 523, type: "triangle", dur: 0.1, gain: 0.16 });
      tone(context, { freq: 659, type: "triangle", at: 0.08, dur: 0.1, gain: 0.16 });
      tone(context, { freq: 880, type: "triangle", at: 0.16, dur: 0.22, gain: 0.16 });
      break;
    case "sobre":
      hiss(context, { dur: 0.22, gain: 0.22, freq: 1500, q: 0.4, type: "highpass" });
      tone(context, { freq: 440, to: 660, type: "sine", at: 0.12, dur: 0.2, gain: 0.14 });
      break;
    case "toc":
      tone(context, { freq: 900, to: 600, type: "square", dur: 0.05, gain: 0.1 });
      break;
    case "uno":
      tone(context, { freq: 660, type: "sawtooth", dur: 0.12, gain: 0.12 });
      tone(context, { freq: 990, type: "sawtooth", at: 0.1, dur: 0.14, gain: 0.12 });
      tone(context, { freq: 1320, type: "triangle", at: 0.2, dur: 0.3, gain: 0.14 });
      break;
    case "error":
      tone(context, { freq: 210, to: 120, type: "sawtooth", dur: 0.22, gain: 0.12 });
      break;
    case "turno":
      tone(context, { freq: 880, type: "sine", dur: 0.1, gain: 0.12 });
      tone(context, { freq: 1320, type: "sine", at: 0.09, dur: 0.16, gain: 0.1 });
      break;
    case "victoria":
      [523, 659, 784, 1046].forEach((freq, i) =>
        tone(context, { freq, type: "triangle", at: i * 0.11, dur: 0.3, gain: 0.16 }),
      );
      break;
  }
}

/* ------------------------------------------------------------------ *
 * Atajos de React                                                     *
 * ------------------------------------------------------------------ */


/** Suena cada vez que `key` cambia (y nunca en el primer pintado). */
export function useSfxOn(key: unknown, name: Sfx | null): void {
  const previous = useRef(key);
  useEffect(() => {
    if (previous.current === key) return;
    previous.current = key;
    if (name) play(name);
  }, [key, name]);
}

/** El estado del interruptor de sonido, sincronizado entre componentes. */
export function useMuted(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    onMuteChange,
    isMuted,
    () => false,
  );
  return [value, setMuted];
}
