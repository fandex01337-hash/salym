// STATIC_EXPORT=1 — статическая сборка для GitHub Pages (без API-роутов, ИИ в демо-режиме).
// PAGES_BASE_PATH — подпуть сайта на GitHub Pages, например /salym.
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.PAGES_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  eslint: { ignoreDuringBuilds: true },
  ...(isStatic
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
