import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	reactCompiler: true,
};

module.exports = {
  allowedDevOrigins: ['192.168.1.23'],
}

export default nextConfig;
