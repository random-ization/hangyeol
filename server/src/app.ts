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
    // ZERO DEPENDENCY: Use native crypto only
    const crypto = require('crypto');

    const endpoint = process.env.SPACES_ENDPOINT;
    const bucket = process.env.SPACES_BUCKET;
    const accessKeyId = process.env.SPACES_KEY;
    const secretAccessKey = process.env.SPACES_SECRET;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return res.status(500).json({ error: 'Missing env vars' });
    }

    // Manual AWS Signature V4 Implementation
    const method = 'GET';
    const service = 's3';
    const region = 'us-east-1'; // Default for Spaces
    const host = new URL(endpoint).host; // e.g. sgp1.digitaloceanspaces.com
    const path = '/';

    // Dates
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // 20240101T000000Z
    const dateStamp = amzDate.slice(0, 8); // 20240101

    // 1. Canonical Request
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const canonicalHeaders = `host:${bucket}.${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');

    // 2. String to Sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    // 3. Signature Calculation
    const getSignatureKey = (key: string, dateStamp: string, regionName: string, serviceName: string) => {
      const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
      const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
      const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
      const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
      return kSigning;
    };

    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    // 4. Auth Header
    const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    res.json({
      success: true,
      message: 'Native Crypto Signing Successful',
      authHeader: authorizationHeader,
      timestamp: amzDate
    });

  } catch (e: any) {
    res.status(500).json({ error: 'Catch error', message: e.message });
  }
});

export default app;
