import http from 'http';

import { createApp } from './app';

export function createServer(): http.Server {
  const app = createApp();
  return http.createServer(app);
}

export default createServer;
