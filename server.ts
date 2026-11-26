import express from 'express';
import {spawn, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer as createViteServer} from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_PORT = Number(process.env.PYTHON_API_PORT || 5001);
const APP_PORT = Number(process.env.PORT || 3000);

function detectPythonCommand(): string {
  const candidates = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  for (const cmd of candidates) {
    const res = spawnSync(cmd, ['--version'], {stdio: 'ignore'});
    if (res.status === 0) {
      return cmd;
    }
  }
  return 'python3';
}

function hasFlask(pythonCmd: string): boolean {
  const res = spawnSync(pythonCmd, ['-c', 'import flask, flask_cors'], {stdio: 'ignore'});
  return res.status === 0;
}

function startPythonBackend() {
  const pythonCmd = detectPythonCommand();
  const useFlask = hasFlask(pythonCmd);
  const scriptPath = useFlask
    ? path.join(__dirname, 'backend', 'app.py')
    : path.join(__dirname, 'backend', 'wsgi_fallback.py');

  const env = {
    ...process.env,
    PORT: String(PYTHON_PORT),
    PYTHON_API_PORT: String(PYTHON_PORT),
    PYTHONUNBUFFERED: '1',
  };

  const child = spawn(pythonCmd, [scriptPath], {
    cwd: __dirname,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (chunk) => {
    process.stdout.write(`[python] ${chunk}`);
  });
  child.stderr?.on('data', (chunk) => {
    process.stderr.write(`[python] ${chunk}`);
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Python backend exited with code ${code}`);
    }
  });

  const cleanup = () => {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  return child;
}

async function waitForPythonBackend(timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/health`);
      if (res.ok) {
        return;
      }
    } catch {
      // Retry until Python HTTP server finishes binding
    }
    await new Promise((r) => setTimeout(r, 120));
  }
}

async function main() {
  startPythonBackend();
  await waitForPythonBackend();

  const app = express();
  app.use(express.json({limit: '10mb'}));

  // Proxy all /api/* requests directly to the Python backend
  app.use('/api', async (req, res) => {
    const targetUrl = `http://127.0.0.1:${PYTHON_PORT}/api${req.url}`;
    try {
      const headers: Record<string, string> = {};
      if (req.headers['content-type']) {
        headers['content-type'] = String(req.headers['content-type']);
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        fetchOptions.body = JSON.stringify(req.body ?? {});
        headers['content-type'] = 'application/json';
      }

      const upstream = await fetch(targetUrl, fetchOptions);
      const contentType = upstream.headers.get('content-type') || 'application/json';
      const contentDisposition = upstream.headers.get('content-disposition');

      res.status(upstream.status);
      res.setHeader('Content-Type', contentType);
      if (contentDisposition) {
        res.setHeader('Content-Disposition', contentDisposition);
      }

      const bodyBuffer = Buffer.from(await upstream.arrayBuffer());
      res.send(bodyBuffer);
    } catch (error) {
      console.error('Python backend proxy error:', error);
      res.status(502).json({
        success: false,
        error: 'Python backend is unavailable. Ensure Python 3 is installed.',
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(APP_PORT, '0.0.0.0', () => {
    console.log(`PrintFlow server listening on http://localhost:${APP_PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start PrintFlow server:', err);
  process.exit(1);
});
