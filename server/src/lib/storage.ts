// server/src/lib/storage.ts - DYNAMIC IMPORT VERSION
// 使用动态导入 AWS SDK，防止启动时因内存或依赖问题导致应用崩溃

import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';
import aws4 from 'aws4';
import https from 'https';
import { Request, Response, NextFunction } from 'express';

dotenv.config();

// 获取 CDN URL 前缀
const getCdnUrl = () => {
  const cdnUrl = process.env.SPACES_CDN_URL;
  if (cdnUrl) return cdnUrl;

  const endpoint = process.env.SPACES_ENDPOINT || '';
  const bucket = process.env.SPACES_BUCKET || '';
  const region = endpoint.replace('https://', '').replace('.digitaloceanspaces.com', '');
  return `https://${bucket}.${region}.cdn.digitaloceanspaces.com`;
};

// 定义允许的文件类型
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  avatar: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  media: [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave',
    'audio/x-wav', 'audio/x-m4a', 'audio/m4a', 'audio/mp4',
    'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac',
    'application/json',
  ],
};

/**
 * 核心：使用 aws4 签名并发送请求到 Spaces
 */
const sendToSpaces = async (method: 'PUT' | 'DELETE', key: string, body?: Buffer | string, contentType?: string) => {
  const endpoint = process.env.SPACES_ENDPOINT;
  const bucket = process.env.SPACES_BUCKET;
  const accessKeyId = process.env.SPACES_KEY;
  const secretAccessKey = process.env.SPACES_SECRET;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing Spaces configuration');
  }

  // 这里的 host 应该是 bucket.region.digitaloceanspaces.com
  // 但 DigitalOcean 的 endpoint 通常是 https://region.digitaloceanspaces.com
  // 所以我们需要解析一下
  const url = new URL(endpoint);
  const host = `${bucket}.${url.host}`; // e.g., mybucket.sgp1.digitaloceanspaces.com
  const path = `/${key}`;

  const opts: any = {
    host,
    path,
    method,
    headers: {
      'x-amz-acl': 'public-read',
    },
    service: 's3',
    region: 'us-east-1', // Spaces 兼容性通常用 us-east-1 或实际 region
  };

  if (contentType) {
    opts.headers['Content-Type'] = contentType;
  }

  if (body) {
    opts.body = body;
  }

  // 签名
  aws4.sign(opts, { accessKeyId, secretAccessKey });

  // 发送请求
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseBody);
        } else {
          reject(new Error(`Spaces request failed: ${res.statusCode} ${responseBody}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (body) req.write(body);
    req.end();
  });
};

// 工具：生成唯一文件名
const generateKey = (folder: string, originalName: string) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(originalName);
  return `${folder}/${year}/${month}/${uniqueSuffix}${ext}`;
};

// 内存存储 Multer 实例
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

/**
 * 高阶函数：创建包含 S3 上传逻辑的中间件
 */
const createUploadMiddleware = (folder: string, type: 'avatar' | 'media', fieldName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const upload = fieldName === 'avatar'
      ? memoryUpload.single('avatar')
      : memoryUpload.single('file');

    upload(req, res, async (err: any) => {
      if (err) return next(err);
      if (!req.file) return next();

      const file = req.file;

      if (!ALLOWED_MIME_TYPES[type].includes(file.mimetype)) {
        return next(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES[type].join(', ')}`));
      }

      try {
        const key = generateKey(folder, file.originalname);

        // 使用 aws4 + https 上传
        await sendToSpaces('PUT', key, file.buffer, file.mimetype);

        const cdnBase = getCdnUrl();
        const url = `${cdnBase}/${key}`;

        // 模拟 multer-s3 行为
        (req.file as any).location = url;
        (req.file as any).key = key;
        delete (req.file as any).buffer;

        next();
      } catch (uploadError: any) {
        console.error('[storage] S3 Upload Failed:', uploadError);
        next(new Error(`File upload failed: ${uploadError.message}`));
      }
    });
  };
};

// 导出兼容对象
const createCompatWrapper = (folder: string, type: 'avatar' | 'media') => {
  return {
    single: (fieldName: string) => createUploadMiddleware(folder, type, fieldName)
  };
};

export const uploadAvatar = createCompatWrapper('avatars', 'avatar') as any;
export const uploadMedia = createCompatWrapper('uploads', 'media') as any;

// 上传 JSON 数据到 S3
export interface UploadJsonResult {
  url: string;
  key: string;
}

export const uploadJsonToS3 = async (data: any, key: string): Promise<UploadJsonResult> => {
  try {
    const jsonString = JSON.stringify(data);

    // 使用 aws4 + https 上传
    await sendToSpaces('PUT', key, jsonString, 'application/json');

    const cdnBase = getCdnUrl();
    return {
      url: `${cdnBase}/${key}`,
      key,
    };
  } catch (e: any) {
    console.error('[storage] JSON Upload Failed:', e);
    throw e;
  }
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  try {
    await sendToSpaces('DELETE', key);
  } catch (e) {
    console.warn('[storage] Delete Failed (non-fatal):', e);
  }
};

export const extractKeyFromUrl = (url: string): string | null => {
  const cdnBase = getCdnUrl();
  if (url.startsWith(cdnBase)) {
    return url.replace(cdnBase + '/', '');
  }
  return null;
};

// S3 连接测试
export const testS3Connection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const key = `debug/connection-test-${Date.now()}.txt`;
    await sendToSpaces('PUT', key, 'Connection Test OK via aws4', 'text/plain');
    await sendToSpaces('DELETE', key);

    return { success: true, message: 'S3 Connection OK (Lightweight)' };
  } catch (e: any) {
    return { success: false, message: e.message || String(e) };
  }
};