import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O painel não usa next/image: a otimização de imagem fica desligada, e com
  // ela some uma porta a mais para quem quiser abusar do servidor.
  images: { unoptimized: true },
};

export default nextConfig;
