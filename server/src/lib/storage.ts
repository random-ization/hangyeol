// server/src/lib/storage.ts - DYNAMIC IMPORT VERSION
// 使用动态导入 AWS SDK，防止启动时因内存或依赖问题导致应用崩溃

import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';

dotenv.config();

// 类型定义（我们需要自己定义或使用 any，为了避免 build 时需要 @aws-sdk 类型，我们这里使用 any）
// 如果编译时有 @aws-sdk/client-s3 依赖，我们可以用 import type
import type { S3Client } from '@aws-sdk/client-s3';

// 延迟初始化 S3 客户端
let _s3Client: S3Client | null = null;

// 动态获取 S3 客户端
const getS3Client = async (): Promise<S3Client> => {
  if (!_s3Client) {
    // DYNAMIC IMPORT: 只有在需要时才加载库
    const { S3Client } = await import('@aws-sdk/client-s3');

    if (!process.env.SPACES_ENDPOINT || !process.env.SPACES_KEY || !process.env.SPACES_SECRET) {
      console.warn('[storage] Missing S3/Spaces configuration');
    }
    _s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: process.env.SPACES_ENDPOINT,
      credentials: {
        accessKeyId: process.env.SPACES_KEY || '',
        secretAccessKey: process.env.SPACES_SECRET || '',
      },
      forcePathStyle: false,
    });
  }
  return _s3Client;
};

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
        const bucket = process.env.SPACES_BUCKET || '';

        // DYNAMIC IMPORT
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const client = await getS3Client();

        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
        });

        await client.send(command);

        const cdnBase = getCdnUrl();
        const url = `${cdnBase}/${key}`;

        // 模拟 multer-s3 行为
        (req.file as any).location = url;
        (req.file as any).key = key;
        delete (req.file as any).buffer;

        next();
      } catch (uploadError) {
        console.error('[storage] S3 Upload Failed:', uploadError);
        // 出错时不崩溃，而是传递错误
        next(new Error(`File upload failed: ${(uploadError as any).message}`));
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
    const bucket = process.env.SPACES_BUCKET || '';
    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString, 'utf-8');

    // DYNAMIC IMPORT
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await getS3Client();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/json',
      ACL: 'public-read',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await client.send(command);

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
    const bucket = process.env.SPACES_BUCKET || '';

    // DYNAMIC IMPORT
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await getS3Client();

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
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
    const bucket = process.env.SPACES_BUCKET;
    if (!bucket) throw new Error('SPACES_BUCKET not defined');

    // DYNAMIC IMPORT
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await getS3Client();

    const key = `debug/connection-test-${Date.now()}.txt`;
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: 'Connection Test OK',
      ContentType: 'text/plain',
      ACL: 'public-read'
    }));

    await deleteFromS3(key);

    return { success: true, message: 'S3 Connection OK' };
  } catch (e: any) {
    return { success: false, message: e.message || String(e) };
  }
};