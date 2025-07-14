import { defineConfig } from 'wxt';
import { version as pkgVersion } from './package.json';

function getManifestVersion() {
  // Extract first 3 digits (e.g., 0.1.0 from 0.1.0-alpha.2)
  const match = pkgVersion.match(/(\d+)\.(\d+)\.(\d+)/);
  const base = match ? `${match[1]}.${match[2]}.${match[3]}` : '0.0.0';
  // Get build number from env or default to 0
  const build = process.env.BUILD_NUMBER || '0';
  return `${base}.${build}`;
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: [],
    name: 'Cursor Stats',
    description: 'Track and visualize your Cursor AI coding activity with charts and statistics',
    version: getManifestVersion(),
    version_name: pkgVersion,
    host_permissions: ['*://cursor.com/*'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
    action: {
      default_title: 'Cursor Stats - Click to view charts',
    },
  },
});
