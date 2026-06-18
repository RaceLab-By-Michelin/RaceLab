import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	reactCompiler: true,
	allowedDevOrigins: ['192.168.1.23'],
	output: 'standalone',
};

export default nextConfig;
