import express from 'express';
import cors from 'cors';
import compression from 'compression';
import contentRoutes from './routes/content.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes';
import dailyPhraseRoutes from './routes/dailyPhrase.routes';
import annotationRoutes from './routes/annotation.routes';

const app = express();

// Middleware - compression 放在最前面
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }) as any);

// Routes (mount admin AFTER app is created and after middleware)
console.log('[Server] Registering routes...');
app.use('/api/auth', authRoutes);
console.log('[Server] /api/auth registered');
app.use('/api/user', userRoutes);
console.log('[Server] /api/user registered');
app.use('/api/content', contentRoutes);
console.log('[Server] /api/content registered');
app.use('/api/admin', adminRoutes);
console.log('[Server] /api/admin registered');
app.use('/api/upload', uploadRoutes);
console.log('[Server] /api/upload registered');
app.use('/api/daily-phrase', dailyPhraseRoutes);
console.log('[Server] /api/daily-phrase registered');
app.use('/api/annotation', annotationRoutes);
console.log('[Server] /api/annotation registered');
app.use('/api/annotations', annotationRoutes);  // 别名，兼容复数形式
console.log('[Server] /api/annotations registered');

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Debug endpoint to test API routing
app.get('/api/debug', (req, res) => {
  res.json({
    message: 'API routes are working!',
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
});

// RAW S3 CHECK (Inline implementation to debug 500 error)
app.get('/api/s3-check-raw', async (req, res) => {
  try {
    const aws4 = require('aws4');
    const https = require('https');

    const endpoint = process.env.SPACES_ENDPOINT;
    const bucket = process.env.SPACES_BUCKET;
    const accessKeyId = process.env.SPACES_KEY;
    const secretAccessKey = process.env.SPACES_SECRET;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return res.status(500).json({ error: 'Missing env vars', endpoint, bucket });
    }

    const url = new URL(endpoint);
    const host = `${bucket}.${url.host}`;
    const opts = {
      host,
      path: '/', // List bucket
      method: 'GET',
      service: 's3',
      region: 'us-east-1',
      headers: { 'x-amz-acl': 'public-read' }
    };

    aws4.sign(opts, { accessKeyId, secretAccessKey });

    const request = https.request(opts, (response: any) => {
      let body = '';
      response.on('data', (chunk: any) => body += chunk);
      response.on('end', () => {
        res.json({
          statusCode: response.statusCode,
          headers: response.headers,
          bodySnippet: body.substring(0, 200), // First 200 chars
          success: response.statusCode === 200
        });
      });
    });

    request.on('error', (e: any) => {
      res.status(500).json({ error: 'Request error', message: e.message });
    });

    request.end();

  } catch (e: any) {
    res.status(500).json({ error: 'Catch error', message: e.message, stack: e.stack });
  }
});

export default app;
