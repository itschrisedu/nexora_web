"use client";

import React, { useState, useEffect } from "react";
import { getGravatarUrl } from "../../utils/gravatar";

interface UserAvatarProps {
  nombre?: string;
  email?: string;
  sizeClassName?: string;
  textClassName?: string;
}

export default function UserAvatar({
  nombre = "Usuario",
  email,
  sizeClassName = "w-8 h-8",
  textClassName = "text-xs font-bold",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const gravatarUrl = getGravatarUrl(email, 120);

  useEffect(() => {
    setImgError(false);
  }, [email]);

  const initials = nombre
    ? nombre
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join("") || nombre.slice(0, 2).toUpperCase()
    : "US";

  return (
    <div
      className={`${sizeClassName} rounded-full flex items-center justify-center shadow-xs shrink-0 overflow-hidden relative select-none`}
      style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
    >
      {gravatarUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={gravatarUrl}
          alt={nombre}
          className="w-full h-full object-cover rounded-full"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={textClassName}>{initials}</span>
      )}
    </div>
  );
}
