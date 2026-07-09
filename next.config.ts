import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desactivar Turbopack: tiene un bug con rutas que contienen caracteres
  // no-ASCII (como la ñ en "Formato_Diseño_Tesis") — usar Webpack clásico.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
