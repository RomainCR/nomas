/** @type {import('next').NextConfig} */
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const basePath =
  repositoryName && !repositoryName.endsWith(".github.io")
    ? `/${repositoryName}`
    : "";

const nextConfig = {
  // Fully static export: `next build` emits the site into ./out
  output: "export",
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // The site is a single poster page; no image optimisation server is needed.
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
