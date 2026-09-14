import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calzado de Cuero - Cevallos, Ecuador",
  description: "Catálogo de calzado de cuero 100% genuino. Venta al por mayor y menor directamente desde fábrica en Cevallos, Tungurahua.",
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-full overflow-y-auto">{children}</div>
  );
}
