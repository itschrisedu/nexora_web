import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo de Calzado - Cevallos, Ecuador",
  description: "Explora nuestro catálogo completo de calzado de cuero. Modelos, tallas y precios directos de fábrica.",
};

export default function CatalogoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-auto overflow-auto">{children}</div>
  );
}
