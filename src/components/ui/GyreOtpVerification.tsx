"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, ShieldCheck, RefreshCw, X, ArrowLeft, Check, AlertTriangle } from 'lucide-react';

interface GyreOtpVerificationProps {
  title?: string;
  subtitle?: string;
  maskedContact?: string;
  onVerify: (code: string) => Promise<{ success: boolean; error?: string }>;
  onResend?: () => Promise<void>;
  onCancel?: () => void;
  onSuccessContinue?: () => void;
  cooldownSeconds?: number;
}

const N = 4;
const ORBIT_R = 1.12;
const TURNS = 1.25;
const CURL_MS = 660;
const CURL_LAG = 38;
const SPIN_MS = 800;
const HOLD_MS = 360;
const SCREW_MS = 520;
const SCREW_LAG = 30;

export const GyreOtpVerification: React.FC<GyreOtpVerificationProps> = ({
  title = "Verificación de Seguridad",
  subtitle = "Ingresa el código de 4 dígitos enviado a",
  maskedContact = "tu correo registrado",
  onVerify,
  onResend,
  onCancel,
  onSuccessContinue,
  cooldownSeconds = 30,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [state, setState] = useState<'idle' | 'filling' | 'checking' | 'ok' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(cooldownSeconds);
  const [isResending, setIsResending] = useState(false);
  const [isLockedRing, setIsLockedRing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const codeGroupRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLLabelElement | null)[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digitSpanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const winRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const glowRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const arcRefs = useRef<(SVGRectElement | null)[]>([]);
  const sparkRefs = useRef<(SVGSVGElement | null)[]>([]);
  const trackRef = useRef<SVGSVGElement | null>(null);
  const hubRef = useRef<HTMLSpanElement | null>(null);
  const burstRef = useRef<HTMLDivElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseBufRef = useRef<AudioBuffer | null>(null);
  const runIdRef = useRef(0);
  const runningAnimsRef = useRef<Animation[]>([]);
  const submitTimerRef = useRef<any>(null);
  const clearTimerRef = useRef<any>(null);

  // ── Web Audio Synth ──
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      try {
        const AudioClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioClass) audioCtxRef.current = new AudioClass();
      } catch {}
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const getNoiseSource = useCallback((c: AudioContext) => {
    if (!noiseBufRef.current) {
      const len = Math.floor(c.sampleRate * 0.5);
      noiseBufRef.current = c.createBuffer(1, len, c.sampleRate);
      const d = noiseBufRef.current.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = noiseBufRef.current;
    src.loop = true;
    return src;
  }, []);

  const playClick = useCallback(() => {
    const c = getAudioCtx();
    if (!c) return;
    try {
      const t = c.currentTime;
      const hi = getNoiseSource(c);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 4200;
      bp.Q.value = 0.9;
      const gh = c.createGain();
      gh.gain.setValueAtTime(0.0001, t);
      gh.gain.exponentialRampToValueAtTime(0.12, t + 0.001);
      gh.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      hi.connect(bp).connect(gh).connect(c.destination);
      hi.start(t);
      hi.stop(t + 0.05);

      const lo = getNoiseSource(c);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 480;
      const gl = c.createGain();
      gl.gain.setValueAtTime(0.0001, t);
      gl.gain.exponentialRampToValueAtTime(0.05, t + 0.002);
      gl.gain.exponentialRampToValueAtTime(0.0001, t + 0.024);
      lo.connect(lp).connect(gl).connect(c.destination);
      lo.start(t);
      lo.stop(t + 0.05);
    } catch {}
  }, [getAudioCtx, getNoiseSource]);

  const playTone = useCallback((freq: number, dur: number, vol: number, type: OscillatorType = 'sine', at = 0) => {
    const c = getAudioCtx();
    if (!c) return;
    try {
      const t = c.currentTime + at;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch {}
  }, [getAudioCtx]);

  const playWhoosh = useCallback((ms: number) => {
    const c = getAudioCtx();
    if (!c) return;
    try {
      const t = c.currentTime;
      const d = ms / 1000;
      const src = getNoiseSource(c);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.3;
      bp.frequency.setValueAtTime(320, t);
      bp.frequency.exponentialRampToValueAtTime(1700, t + d * 0.52);
      bp.frequency.exponentialRampToValueAtTime(420, t + d);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.075, t + d * 0.4);
      g.gain.linearRampToValueAtTime(0.05, t + d * 0.72);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      src.connect(bp).connect(g).connect(c.destination);
      src.start(t);
      src.stop(t + d + 0.05);
    } catch {}
  }, [getAudioCtx, getNoiseSource]);

  const playThunk = useCallback(() => {
    const c = getAudioCtx();
    if (!c) return;
    try {
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(64, t + 0.16);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 0.28);
    } catch {}
  }, [getAudioCtx]);

  const playSoundOk = useCallback(() => {
    playTone(659, 0.12, 0.08);
    playTone(988, 0.22, 0.08, 'sine', 0.1);
  }, [playTone]);

  const playSoundErr = useCallback(() => {
    playTone(196, 0.16, 0.09, 'sawtooth');
    playTone(147, 0.22, 0.07, 'sawtooth', 0.09);
  }, [playTone]);

  const playSoundLock = useCallback(() => {
    playTone(523, 0.09, 0.05, 'triangle');
  }, [playTone]);

  // ── Helpers ──
  const playAnim = (el: HTMLElement | SVGElement | null, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
    if (!el || typeof el.animate !== 'function') return null;
    const a = el.animate(frames, opts);
    runningAnimsRef.current.push(a);
    return a;
  };

  const chargeSlot = (idx: number, delay = 0, duration = 700) => {
    const arc = arcRefs.current[idx];
    const spark = sparkRefs.current[idx];
    if (arc) {
      playAnim(arc, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
        duration,
        delay,
        easing: 'cubic-bezier(0.35, 0, 0.15, 1)',
      });
    }
    if (spark) {
      playAnim(spark, [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.1 },
        { opacity: 1, offset: 0.78 },
        { opacity: 0, offset: 1 },
      ], { duration: duration + 60, delay, easing: 'linear' });
    }
  };

  const measureOrbit = () => {
    const slots = slotRefs.current.filter(Boolean) as HTMLLabelElement[];
    const wrap = wrapRef.current;
    if (!wrap || slots.length < N) return null;

    const r = slots.map((s) => s.getBoundingClientRect());
    const box = wrap.getBoundingClientRect();
    const w = r[0].width;
    const h = r[0].height;
    const cx = (r[0].left + r[N - 1].right) / 2;
    const cy = r[0].top + h / 2;
    const R = w * ORBIT_R;

    const p = r.map((b) => [b.left + b.width / 2, b.top + b.height / 2]);
    const a0 = p.map(([x]) => (x < cx ? Math.PI : 0));
    const r0 = p.map(([x]) => Math.abs(x - cx));
    const a1 = slots.map((_, i) => Math.PI + (i * Math.PI) / 2);
    const turn = a1.map((a, i) => {
      let d = (a - a0[i]) % (Math.PI * 2);
      if (d < 0) d += Math.PI * 2;
      if (d > Math.PI) d -= Math.PI * 2;
      return d;
    });

    return { w, h, R, cx, cy, box, p, a0, r0, a1, turn };
  };

  const atPoint = (g: any, i: number, ang: number, rad: number, rot: number, sc: number) => {
    const x = g.cx + Math.cos(ang) * rad - g.p[i][0];
    const y = g.cy + Math.sin(ang) * rad - g.p[i][1];
    return `translate(${Math.round(x * 100) / 100}px, ${Math.round(y * 100) / 100}px) rotate(${Math.round(rot * 100) / 100}deg) scale(${Math.round(sc * 100) / 100})`;
  };

  const ringDelta = (g: any, i: number) => [
    Math.round((g.cx + Math.cos(g.a1[i]) * g.R - g.p[i][0]) * 100) / 100,
    Math.round((g.cy + Math.sin(g.a1[i]) * g.R - g.p[i][1]) * 100) / 100,
  ];

  const throwMotes = () => {
    const burst = burstRef.current;
    if (!burst) return;
    burst.innerHTML = '';
    const TAU = Math.PI * 2;
    const MOTES = 18;

    for (let i = 0; i < MOTES; i++) {
      const mote = document.createElement('span');
      mote.className = `mote absolute rounded-full ${
        i % 3 === 0 ? 'w-1 h-1' : i % 5 === 0 ? 'w-2.5 h-2.5' : 'w-2 h-2'
      } ${i % 4 === 1 ? 'bg-emerald-200' : 'bg-emerald-400'}`;
      mote.style.boxShadow = '0 0 10px rgba(16,185,129,0.4), 0 0 20px rgba(52,211,153,0.3)';
      burst.appendChild(mote);

      const a = (i / MOTES) * TAU + (Math.random() - 0.5) * 0.55;
      const dist = 74 + Math.random() * 76;

      playAnim(mote, [
        { transform: 'translate(0, 0) scale(0.2)', opacity: 0, offset: 0 },
        { transform: `translate(${Math.cos(a) * dist * 0.36}px, ${Math.sin(a) * dist * 0.36}px) scale(1)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${Math.cos(a) * dist * 0.72}px, ${Math.sin(a) * dist * 0.72 + 8}px) scale(0.9)`, opacity: 0.95, offset: 0.58 },
        { transform: `translate(${Math.cos(a) * dist}px, ${Math.sin(a) * dist + 18}px) scale(0.4)`, opacity: 0, offset: 1 },
      ], {
        duration: 1100 + Math.random() * 420,
        delay: 60 + Math.random() * 130,
        easing: 'cubic-bezier(0.12, 0.75, 0.28, 1)',
      })?.finished.then(() => mote.remove(), () => mote.remove());
    }
  };

  const runGyreAnimation = async (token: number) => {
    const g = measureOrbit();
    if (!g) return;

    const track = trackRef.current;
    const hub = hubRef.current;
    const slots = slotRefs.current.filter(Boolean) as HTMLLabelElement[];
    const wins = winRefs.current.filter(Boolean) as HTMLSpanElement[];

    if (track && hub) {
      const d = g.R * 2;
      track.style.width = `${Math.round(d)}px`;
      track.style.height = `${Math.round(d)}px`;
      track.style.left = `${Math.round(g.cx - g.R - g.box.left)}px`;
      track.style.top = `${Math.round(g.cy - g.R - g.box.top)}px`;
      hub.style.left = `${Math.round(g.cx - g.box.left)}px`;
      hub.style.top = `${Math.round(g.cy - g.box.top)}px`;
    }

    const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const outBack = (t: number, s = 1.5) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

    // 1. Curl
    const CURL_STEPS = 20;
    slots.forEach((s, i) => {
      const frames = [
        { transform: atPoint(g, i, g.a0[i], g.r0[i], 0, 1), offset: 0 },
        { transform: atPoint(g, i, g.a0[i], g.r0[i], 0, 0.9), offset: 0.16 },
      ];
      for (let k = 1; k <= CURL_STEPS; k++) {
        const t = k / CURL_STEPS;
        const e = outBack(t);
        const ang = g.a0[i] + g.turn[i] * outCubic(t);
        const rad = g.r0[i] + (g.R - g.r0[i]) * e;
        frames.push({
          transform: atPoint(g, i, ang, rad, 0, 0.9 + 0.1 * outCubic(t)),
          offset: 0.16 + 0.84 * t,
        });
      }
      playAnim(s, frames, { duration: CURL_MS, delay: i * CURL_LAG, easing: 'linear', fill: 'forwards' });
      setTimeout(playClick, i * CURL_LAG);
    });

    if (track) {
      track.style.opacity = '1';
      playAnim(track, [
        { transform: 'scale(0.72) rotate(-24deg)', opacity: 0 },
        { transform: 'scale(1) rotate(0deg)', opacity: 1 },
      ], { duration: CURL_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
    }

    await new Promise((r) => setTimeout(r, CURL_MS + CURL_LAG * (N - 1) + 60));
    if (token !== runIdRef.current) return;

    // 2. Spin
    const total = TURNS * 360;
    const REST = total % 360;

    slots.forEach((s, i) => {
      s.style.transformOrigin = `${Math.round(g.cx - g.p[i][0] + g.w / 2)}px ${Math.round(g.cy - g.p[i][1] + g.h / 2)}px`;
      const d = ringDelta(g, i);
      playAnim(s, [
        { transform: `rotate(0deg) translate(${d[0]}px, ${d[1]}px)` },
        { transform: `rotate(${total}deg) translate(${d[0]}px, ${d[1]}px)` },
      ], { duration: SPIN_MS, easing: 'cubic-bezier(0.62, 0, 0.38, 1)', fill: 'forwards' });

      if (wins[i]) {
        playAnim(wins[i], [
          { transform: 'rotate(0deg)', offset: 0 },
          { transform: 'rotate(0deg)', offset: 0.62 },
          { transform: `rotate(${-REST}deg)`, offset: 1 },
        ], { duration: SPIN_MS, easing: 'cubic-bezier(0.32, 0, 0.2, 1)', fill: 'forwards' });
      }
    });

    if (track) {
      playAnim(track, [
        { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0 },
        { transform: 'scale(1.05) rotate(34deg)', opacity: 0.85, offset: 0.5 },
        { transform: 'scale(1) rotate(52deg)', opacity: 1, offset: 1 },
      ], { duration: SPIN_MS, easing: 'ease-in-out', fill: 'forwards' });
    }

    if (hub) {
      hub.style.opacity = '1';
      playAnim(hub, [
        { transform: 'scale(0.3)', opacity: 0 },
        { transform: 'scale(1)', opacity: 0.9 },
      ], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });
    }

    slots.forEach((_, i) => chargeSlot(i, i * 40, SPIN_MS * 0.72));
    playWhoosh(SPIN_MS);

    await new Promise((r) => setTimeout(r, SPIN_MS));
    if (token !== runIdRef.current) return;

    setIsLockedRing(true);
    playSoundLock();

    glowRefs.current.filter(Boolean).forEach((glow) => {
      playAnim(glow, [
        { transform: 'scale(0.9)', opacity: 0 },
        { transform: 'scale(1.18)', opacity: 0.9, offset: 0.4 },
        { transform: 'scale(1.4)', opacity: 0 },
      ], { duration: 520, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
    });

    await new Promise((r) => setTimeout(r, HOLD_MS));
    if (token !== runIdRef.current) return;

    // 3. Screw Down
    const END_S = 0.24;
    const EXTRA = 150;

    slots.forEach((s, i) => {
      const d = ringDelta(g, i);
      const v0x = g.p[i][0] - g.cx;
      const v0y = g.p[i][1] - g.cy;

      playAnim(s, [
        { transform: `rotate(${total}deg) translate(${d[0]}px, ${d[1]}px) scale(1)` },
        { transform: `rotate(${total + EXTRA}deg) translate(${Math.round(-END_S * v0x)}px, ${Math.round(-END_S * v0y)}px) scale(${END_S})` },
      ], { duration: SCREW_MS, delay: i * SCREW_LAG, easing: 'cubic-bezier(0.55, 0, 0.35, 1)', fill: 'forwards' });

      playAnim(s, [
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.62 },
        { opacity: 0, offset: 1 },
      ], { duration: SCREW_MS, delay: i * SCREW_LAG, easing: 'linear', fill: 'forwards' });

      if (wins[i]) {
        playAnim(wins[i], [
          { opacity: 1 },
          { opacity: 0 },
        ], { duration: 260, delay: SCREW_MS * 0.4, easing: 'linear', fill: 'forwards' });
      }
    });

    if (track) {
      playAnim(track, [
        { transform: 'scale(1) rotate(52deg)', opacity: 1 },
        { transform: 'scale(0.1) rotate(96deg)', opacity: 0 },
      ], { duration: SCREW_MS, easing: 'cubic-bezier(0.6, 0, 0.3, 1)', fill: 'forwards' });
    }

    if (hub) {
      playAnim(hub, [
        { transform: 'scale(1)', opacity: 0.9, offset: 0 },
        { transform: 'scale(1.8)', opacity: 1, offset: 0.78 },
        { transform: 'scale(3.2)', opacity: 0, offset: 1 },
      ], { duration: SCREW_MS + 120, easing: 'cubic-bezier(0.5, 0, 0.3, 1)', fill: 'forwards' });
    }

    setTimeout(playThunk, SCREW_MS * 0.72);
    await new Promise((r) => setTimeout(r, SCREW_MS + SCREW_LAG * (N - 1) + 40));
  };

  // ── Verification Execution ──
  const handleVerify = async (codeToVerify: string) => {
    if (state === 'checking' || state === 'ok') return;
    setState('checking');
    setErrorMessage('');
    setIsLockedRing(false);

    const token = ++runIdRef.current;
    const res = await onVerify(codeToVerify);

    if (!res.success) {
      await new Promise((r) => setTimeout(r, 400));
      if (token !== runIdRef.current) return;
      setState('error');
      setErrorMessage(res.error || 'Código incorrecto. Verifica los 4 dígitos ingresados.');
      playSoundErr();

      inputRefs.current[0]?.focus();

      clearTimerRef.current = setTimeout(async () => {
        setDigits(['', '', '', '']);
        setState('filling');
        setErrorMessage('');
        inputRefs.current[0]?.focus();
      }, 1000);
      return;
    }

    // Success flow
    await runGyreAnimation(token);
    if (token !== runIdRef.current) return;

    setState('ok');
    playSoundOk();
    throwMotes();

    setTimeout(() => {
      if (onSuccessContinue) onSuccessContinue();
    }, 1200);
  };

  // ── Input & Typing Handlers ──
  const focusInput = (index: number) => {
    const idx = Math.max(0, Math.min(N - 1, index));
    inputRefs.current[idx]?.focus();
    inputRefs.current[idx]?.select();
  };

  const handleSlotInput = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    if (state === 'error') {
      clearTimeout(clearTimerRef.current);
      setErrorMessage('');
    }

    const val = e.target.value.replace(/\D/g, '');

    if (!val) {
      const next = [...digits];
      next[idx] = '';
      setDigits(next);
      setState('filling');
      return;
    }

    if (val.length > 1) {
      // Paste of multiple chars
      const chars = val.slice(0, N).split('');
      const next = [...digits];
      chars.forEach((c, i) => {
        if (i < N) next[i] = c;
      });
      setDigits(next);
      chars.forEach((_, i) => chargeSlot(i, i * 60));
      setState('filling');
      focusInput(Math.min(chars.length, N - 1));

      if (next.every(Boolean)) {
        setTimeout(() => handleVerify(next.join('')), 300);
      }
      return;
    }

    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    chargeSlot(idx);
    playClick();
    setState('filling');

    if (idx < N - 1) {
      focusInput(idx + 1);
    }

    if (next.every(Boolean)) {
      clearTimeout(submitTimerRef.current);
      submitTimerRef.current = setTimeout(() => {
        handleVerify(next.join(''));
      }, 340);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) {
        const next = [...digits];
        next[idx - 1] = '';
        setDigits(next);
        focusInput(idx - 1);
      } else {
        const next = [...digits];
        next[idx] = '';
        setDigits(next);
      }
      setState('filling');
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      focusInput(idx - 1);
    } else if (e.key === 'ArrowRight' && idx < N - 1) {
      focusInput(idx + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, N);
    if (!pasted) return;

    const chars = pasted.split('');
    const next = [...digits];
    chars.forEach((c, i) => {
      if (i < N) next[i] = c;
    });
    setDigits(next);
    chars.forEach((_, i) => chargeSlot(i, i * 60));
    setState('filling');
    focusInput(Math.min(chars.length, N - 1));

    if (next.every(Boolean)) {
      setTimeout(() => handleVerify(next.join('')), 300);
    }
  };

  // ── Cooldown timer ──
  useEffect(() => {
    let interval: any = null;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResendCode = async () => {
    if (cooldown > 0 || isResending || !onResend) return;
    setIsResending(true);
    try {
      await onResend();
      setCooldown(cooldownSeconds);
      setDigits(['', '', '', '']);
      setState('filling');
      setErrorMessage('');
      focusInput(0);
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    focusInput(0);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-md mx-auto p-6 md:p-8 rounded-3xl bg-linear-to-b from-[#14161a] to-[#0a0c0f] border border-white/10 shadow-2xl text-center overflow-hidden"
    >
      {/* Botón Cerrar/Atrás si está disponible */}
      {onCancel && state !== 'ok' && (
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 left-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          title="Regresar"
        >
          <ArrowLeft size={18} />
        </button>
      )}

      {/* Grabber decorativo */}
      <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-6" />

      {/* Encabezado */}
      <div className="space-y-2 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck size={13} />
          <span>Verificación en Dos Pasos</span>
        </div>

        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
          {state === 'ok' ? '¡Verificación Exitosa!' : title}
        </h2>

        <p className="text-xs md:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
          {state === 'ok' ? (
            <span className="text-emerald-400 font-semibold">Sesión autorizada correctamente. Ingresando...</span>
          ) : (
            <>
              {subtitle} <b className="text-slate-200 font-bold">{maskedContact}</b>
            </>
          )}
        </p>
      </div>

      {/* Stage de animación y slots */}
      <div ref={wrapRef} className="relative my-8 select-none" style={{ minHeight: '84px' }}>
        {/* Órbita animada */}
        <div className="absolute inset-0 pointer-events-none z-1">
          <svg
            ref={trackRef}
            className="absolute opacity-0 transition-opacity"
            viewBox="0 0 100 100"
            style={{ width: '100px', height: '100px', transformOrigin: 'center' }}
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="rgba(52, 211, 153, 0.45)"
              strokeWidth="1.8"
              strokeDasharray="3 8"
              strokeLinecap="round"
            />
          </svg>
          <span
            ref={hubRef}
            className="absolute w-2 h-2 rounded-full bg-emerald-400 opacity-0 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
            style={{ margin: '-4px 0 0 -4px' }}
          />
        </div>

        {/* Cajas de dígitos */}
        <div
          ref={codeGroupRef}
          className={`flex justify-center items-center gap-3 relative z-2 ${
            state === 'error' ? 'animate-shake' : ''
          }`}
          onPaste={handlePaste}
        >
          {[0, 1, 2, 3].map((idx) => {
            return (
              <label
                key={idx}
                ref={(el) => { slotRefs.current[idx] = el; }}
                className={`relative w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#1c1f24] border transition-all cursor-text flex items-center justify-center ${
                  isLockedRing
                    ? 'bg-[#06241a] border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.35)]'
                    : state === 'error'
                    ? 'bg-rose-950/30 border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                    : 'border-white/10 hover:border-white/20 focus-within:border-emerald-500 focus-within:bg-[#20252e] focus-within:shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                }`}
              >
                <input
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digits[idx]}
                  onChange={(e) => handleSlotInput(e, idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  disabled={state === 'checking' || state === 'ok'}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-text z-4"
                  autoComplete="off"
                />

                {/* Mirrored display digit */}
                <span
                  ref={(el) => { winRefs.current[idx] = el; }}
                  className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl z-2 pointer-events-none"
                >
                  <span
                    ref={(el) => { digitSpanRefs.current[idx] = el; }}
                    className={`text-2xl md:text-3xl font-black font-mono transition-colors ${
                      isLockedRing ? 'text-emerald-300' : 'text-white'
                    }`}
                  >
                    {digits[idx]}
                  </span>
                </span>

                {/* Glow afterglow */}
                <span
                  ref={(el) => { glowRefs.current[idx] = el; }}
                  className="absolute inset-[-10%] rounded-2xl bg-radial from-emerald-500/30 to-transparent opacity-0 pointer-events-none z-1"
                />

                {/* Spark charge particle border */}
                <svg
                  ref={(el) => { sparkRefs.current[idx] = el; }}
                  className="absolute inset-0 w-full h-full pointer-events-none z-3 opacity-0"
                  viewBox="0 0 64 64"
                >
                  <rect
                    ref={(el) => { arcRefs.current[idx] = el; }}
                    x="2"
                    y="2"
                    width="60"
                    height="60"
                    rx="14"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="2.5"
                    strokeDasharray="0.32 0.68"
                    strokeDashoffset="1"
                    pathLength={1}
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(52,211,153,0.8))' }}
                  />
                </svg>
              </label>
            );
          })}
        </div>

        {/* Seal Tile final check */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-3">
          <div
            className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#06241a] border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-500 ${
              state === 'ok'
                ? 'opacity-100 rotate-0 scale-100'
                : 'opacity-0 -rotate-45 scale-50'
            }`}
          >
            <Check size={32} className="text-emerald-300 stroke-[3.5]" />
          </div>
        </div>

        {/* Burst Motes Container */}
        <div ref={burstRef} className="absolute inset-0 flex items-center justify-center pointer-events-none z-5" />
      </div>

      {/* Mensaje de Error */}
      {errorMessage && (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2.5 px-4 rounded-xl mb-4 animate-in fade-in">
          <AlertTriangle size={15} className="shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Pie: Reenviar y Acciones */}
      <div className="pt-2 border-t border-white/5 flex flex-col items-center gap-3">
        {state !== 'ok' ? (
          <div className="flex items-center justify-between w-full text-xs text-slate-400">
            <span>¿No recibiste el código?</span>
            <button
              type="button"
              disabled={cooldown > 0 || isResending}
              onClick={handleResendCode}
              className="font-bold text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isResending
                ? 'Enviando...'
                : cooldown > 0
                ? `Reenviar en ${cooldown}s`
                : 'Reenviar código'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSuccessContinue}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
          >
            Continuar al Sistema
          </button>
        )}
      </div>
    </div>
  );
};
