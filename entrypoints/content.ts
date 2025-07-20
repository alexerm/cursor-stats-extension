import React from 'react';
import ReactDOM from 'react-dom/client';
import ActivityChart from './components/ActivityChart';

export default defineContentScript({
  matches: ['*://cursor.com/*'],
  main() {
    let currentRoot: ReactDOM.Root | null = null;

    // Wait for the page to load and the target element to be available
    const waitForElement = (selector: string, timeout = 15000) => {
      return new Promise<Element>((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            resolve(element);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
      });
    };

    const mountActivityChart = async () => {
      // Remove existing chart if it exists
      const existingChart = document.getElementById('cursor-activity-chart');
      if (existingChart) {
        if (currentRoot) {
          currentRoot.unmount();
          currentRoot = null;
        }
        existingChart.remove();
      }

      // Check if we're on the dashboard usage tab
      if (window.location.pathname === '/dashboard' && window.location.search === '?tab=usage') {
        try {
          const targetElement = await waitForElement(
            'main > div > div:nth-child(2) > div > div > div:nth-child(2) > div',
          );

          // Create a container for our activity chart
          const chartContainer = document.createElement('div');
          chartContainer.id = 'cursor-activity-chart';
          chartContainer.style.marginBottom = '24px';

          // Insert the container as the second child
          targetElement.insertBefore(chartContainer, targetElement.children[1]);

          // Render the React component
          currentRoot = ReactDOM.createRoot(chartContainer);
          currentRoot.render(React.createElement(ActivityChart));
        } catch {
          // Failed to inject activity chart
        }
      }
    };

    // Function to ensure DOM is ready
    const ensureDOMReady = () => {
      return new Promise<void>((resolve) => {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => resolve());
        } else {
          resolve();
        }
      });
    };

    // Mount on initial load with proper DOM readiness check
    const initializeChart = async () => {
      await ensureDOMReady();
      // Add a small delay to ensure page content has loaded
      setTimeout(mountActivityChart, 500);
    };

    // Initialize on load
    initializeChart();

    // Listen for navigation changes (SPA routing)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        // Small delay to ensure the new page content has loaded
        setTimeout(mountActivityChart, 100);
      }
    }).observe(document, { subtree: true, childList: true });

    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(mountActivityChart, 100);
    });
  },
});
