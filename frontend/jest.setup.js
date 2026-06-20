// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock WebGL and ResizeObserver since JSDOM doesn't support them out-of-the-box
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock WebSockets
global.WebSocket = class MockWebSocket {
  constructor(url) {
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 50);
  }
  send(data) {}
  close() {}
};
