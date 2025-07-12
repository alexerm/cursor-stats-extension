import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Cursor Stats',
    description: 'Track and visualize your Cursor AI coding activity with charts and statistics',
    version: '1.0.0',
    permissions: [
      'storage',
      'activeTab'
    ],
    host_permissions: [
      '*://cursor.com/*'
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'"
    },
    action: {
      default_title: 'Cursor Stats'
    }
  }
});
