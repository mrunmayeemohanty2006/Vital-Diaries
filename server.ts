import express from 'express';
import http from 'http';
import path from 'path';
import net from 'net';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const currentDirname = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

function isPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function ensureDjangoRunning() {
  const isRunning = await isPortOpen(8000);
  if (isRunning) {
    console.log('✓ Django Authentication Backend is active on http://127.0.0.1:8000');
    return;
  }

  console.log('⚡ Starting Django Backend on http://127.0.0.1:8000...');
  const pythonPath = path.join(currentDirname, 'backend/venv/bin/python');
  const managePy = path.join(currentDirname, 'backend/manage.py');

  const djangoProcess = spawn(pythonPath, [managePy, 'runserver', '127.0.0.1:8000', '--noreload'], {
    cwd: path.join(currentDirname, 'backend'),
    stdio: 'inherit',
  });

  djangoProcess.on('error', (err) => {
    console.error('Django Subprocess Error:', err.message);
  });

  process.on('exit', () => {
    djangoProcess.kill();
  });
}

async function startServer() {
  await ensureDjangoRunning();
  const app = express();
  const PORT = Number(process.env.PORT) || 5174;
  const DJANGO_BASE_URL = process.env.DJANGO_BACKEND_URL || 'http://127.0.0.1:8000';

  // Increase payload limit for base64 uploads
  app.use(express.json({ limit: '20mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Proxy Django authentication, device management, and admin portal
  app.use(['/api/auth', '/api/devices', '/api/activity', '/admin'], (req, res) => {
    try {
      const targetUrl = new URL(req.originalUrl, DJANGO_BASE_URL);
      const headers: Record<string, string | string[] | undefined> = { ...req.headers };
      headers.connection = 'close';
      delete headers.host;

      let bodyData: string | Buffer | null = null;
      if (req.body && Object.keys(req.body).length > 0) {
        bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        headers['content-type'] = 'application/json';
        headers['content-length'] = Buffer.byteLength(bodyData).toString();
      } else {
        delete headers['content-length'];
      }

      const proxyReq = http.request(
        {
          hostname: targetUrl.hostname || '127.0.0.1',
          port: Number(targetUrl.port) || 8000,
          path: targetUrl.pathname + targetUrl.search,
          method: req.method,
          headers,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err: any) => {
        console.error(`Django Proxy Connection Error (${req.originalUrl}):`, err.message);
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            error: 'Authentication backend service is offline. Please start the Django server (python backend/manage.py runserver 127.0.0.1:8000).',
          });
        }
      });

      if (bodyData) {
        proxyReq.write(bodyData);
      }
      proxyReq.end();
    } catch (proxyErr: any) {
      console.error('Proxy dispatch error:', proxyErr);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Proxy dispatch failed' });
      }
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(currentDirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vital Diaries Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
