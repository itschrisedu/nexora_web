"use client";

import React, { useState } from "react";

interface UserAvatarProps {
  nombre?: string;
  email?: string;
  avatarUrl?: string;
  sizeClassName?: string;
  textClassName?: string;
}

// Paleta de gradientes elegantes deterministas según el nombre/correo
const AVATAR_GRADIENTS = [
  "from-slate-900 to-slate-800 text-amber-400 border-amber-500/30",
  "from-slate-900 to-slate-800 text-emerald-400 border-emerald-500/30",
  "from-slate-900 to-slate-800 text-blue-400 border-blue-500/30",
  "from-slate-900 to-slate-800 text-purple-400 border-purple-500/30",
  "from-slate-900 to-slate-800 text-cyan-400 border-cyan-500/30",
  "from-slate-900 to-slate-800 text-rose-400 border-rose-500/30",
];

function getGradientIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_GRADIENTS.length;
}

export default function UserAvatar({
  nombre = "Usuario",
  email = "",
  avatarUrl,
  sizeClassName = "w-8 h-8",
  textClassName = "text-xs font-bold",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const cleanName = (nombre || "").trim();
  const initials = cleanName
    ? cleanName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join("") || cleanName.slice(0, 2).toUpperCase()
    : (email ? email.slice(0, 2).toUpperCase() : "US");

  const colorScheme = AVATAR_GRADIENTS[getGradientIndex(cleanName || email || "NEXORA")];

  return (
    <div
      className={`${sizeClassName} rounded-xl bg-gradient-to-br ${colorScheme} border flex items-center justify-center shadow-xs shrink-0 overflow-hidden relative select-none`}
    >
      {avatarUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={cleanName}
          className="w-full h-full object-cover rounded-xl"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={`${textClassName} tracking-tight font-black font-sans`}>
          {initials}
        </span>
      )}
    </div>
  );
}
