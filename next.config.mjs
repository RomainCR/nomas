/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static export: `next build` emits the site into ./out
  output: "export",
  // The site is a single poster page; no image optimisation server is needed.
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
