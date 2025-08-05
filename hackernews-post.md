Show HN: Enhanced analytics for Cursor AI – visualize token usage, costs, and coding patterns

I've been using Cursor heavily for the past 14 months, but after recent pricing changes, I kept hitting their usage limits without understanding why. The dashboard shows basic numbers but no patterns or trends - just raw counts that don't help you optimize your workflow or spending. This became especially important after Cursor's recent controversial pricing changes, where understanding your usage patterns became crucial for managing costs effectively.

So I built a browser extension that injects better charts directly into Cursor's dashboard. It takes the same data they already show you but makes it actually useful with interactive calendars, heatmaps, and bar charts.

The extension shows things like which days you're most productive with AI assistance, when you accept the most code suggestions, how your token usage patterns change over time, and whether you should switch between subscription vs usage-based pricing. Everything runs locally in your browser - it just enhances the existing dashboard without sending data anywhere.

Technically, it's a content script that injects React components into cursor.com/dashboard using the WXT framework. I used Nivo.js for the visualizations and added local storage caching so it doesn't hammer their API. The extension fetches from Cursor's existing analytics endpoints, so no reverse engineering or scraping involved.

You can try it if you use Cursor:

🚀 **Install from Chrome Web Store**: https://chromewebstore.google.com/detail/cursor-stats/fdlfealdpfjfjnadhdobllmondagkcal (recommended - one-click install)

Or download from GitHub releases (Firefox version also available), or clone the repo and run `pnpm install && pnpm build` to load it manually. The source is MIT licensed: https://github.com/alexerm/cursor-stats-extension

I'm curious what other metrics would be useful to track or if anyone else has been frustrated by the basic analytics. Also open to suggestions on making the installation process simpler.
