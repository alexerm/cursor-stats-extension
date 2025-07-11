import React from 'react';
import ReactDOM from 'react-dom/client';
import ActivityChart from './components/ActivityChart';

export default defineContentScript({
  matches: ['*://cursor.com/*'],
  main() {
    // Wait for the page to load and the target element to be available
    const waitForElement = (selector: string, timeout = 10000) => {
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

    // Check if we're on the dashboard page
    if (window.location.pathname === '/dashboard') {
      waitForElement('main > div > div:nth-child(2) > div > div > div:nth-child(2) > div')
        .then((targetElement) => {
          // Create a container for our activity chart
          const chartContainer = document.createElement('div');
          chartContainer.id = 'cursor-activity-chart';
          chartContainer.style.marginBottom = '24px';
          
          // Insert the container as the second child
          targetElement.insertBefore(chartContainer, targetElement.children[1]);
          
          // Render the React component
          const root = ReactDOM.createRoot(chartContainer);
          root.render(React.createElement(ActivityChart));
        })
        .catch((error) => {
          console.error('Failed to inject activity chart:', error);
        });
    }
  },
});
