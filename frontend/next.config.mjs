const backendUrl = process.env.PRIMESCHOOL_API_URL || process.env.PRIMEX_API_URL || "http://127.0.0.1:8000";

const nextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  }
};

export default nextConfig;