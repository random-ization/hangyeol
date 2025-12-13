import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';

dotenv.config();

// 延迟初始化 S3 客户端
let _s3Client: S3Client | null = null;
const getS3Client = (): S3Client => {
  if (!_s3Client) {
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
 * 替代之前的 multer-s3 自动上传
 */
const createUploadMiddleware = (folder: string, type: 'avatar' | 'media', fieldName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. 使用 multer 处理 multipart/form-data，将文件读入内存
    const upload = fieldName === 'avatar'
      ? memoryUpload.single('avatar')
      : memoryUpload.single('file');

    upload(req, res, async (err: any) => {
      if (err) return next(err);
      if (!req.file) return next(); // 没有文件，继续（可能是可选上传）

      const file = req.file;

      // 2. 验证文件类型
      if (!ALLOWED_MIME_TYPES[type].includes(file.mimetype)) {
        return next(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES[type].join(', ')}`));
      }

      // 3. 上传到 S3
      try {
        const key = generateKey(folder, file.originalname);
        const bucket = process.env.SPACES_BUCKET || '';

        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
        });

        await getS3Client().send(command);

        // 4. 构造完整 URL 并回填到 req.file (模拟 multer-s3 的行为)
        const cdnBase = getCdnUrl();
        const url = `${cdnBase}/${key}`;

        // Multer-S3 通常会添加 location 和 key 属性
        (req.file as any).location = url;
        (req.file as any).key = key;

        // 清理 buffer 释放内存
        delete (req.file as any).buffer;

        next();
      } catch (uploadError) {
        console.error('[storage] S3 Upload Failed:', uploadError);
        next(new Error('File upload to storage failed'));
      }
    });
  };
};

/**
 * 为了保持与现有路由的兼容性 (router.post('/', upload.single('file'), ...))
 * 我们需要导出一个对象，该对象具有 .single() 方法。
 * 但我们的自定义中间件已经是“处理过”的了。
 * 
 * 解决方案：导出一个伪造的 multer 对象，其 single 方法返回我们的自定义中间件。
 */
const createCompatWrapper = (folder: string, type: 'avatar' | 'media') => {
  return {
    single: (fieldName: string) => createUploadMiddleware(folder, type, fieldName)
  };
};

// 导出兼容的上传中间件
export const uploadAvatar = createCompatWrapper('avatars', 'avatar') as any; // any cast to trick express types if needed
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

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/json',
      ACL: 'public-read',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await getS3Client().send(command);

    const cdnBase = getCdnUrl();
    return {
      url: `${cdnBase}/${key}`,
      key,
    };
  } catch (e: any) {
    console.error('[storage] JSON Upload Failed:', e);
    // 降级策略：如果上传失败，抛出错误，让调用者降级到数据库存储
    throw e;
  }
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  try {
    const bucket = process.env.SPACES_BUCKET || '';

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await getS3Client().send(command);
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

    // 尝试列出对象或上传一个小文件来测试权限
    // 这里简单地尝试上传一个测试文件
    const key = `debug/connection-test-${Date.now()}.txt`;
    await getS3Client().send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: 'Connection Test OK',
      ContentType: 'text/plain',
      ACL: 'public-read'
    }));

    // 清理
    await deleteFromS3(key);

    return { success: true, message: 'S3 Connection OK' };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
};