// server/src/lib/storage.ts - STUB VERSION
// 临时回滚版本：移除所有 S3 依赖，仅保留空壳函数以防报错

import multer from 'multer';

// 模拟 S3 客户端导出 (避免引用报错)
export const s3Client = {};

// 模拟上传结果接口
export interface UploadJsonResult {
  url: string;
  key: string;
}

// 1. Mock 上传函数：总是返回内存存储配置 (不依赖 S3)
const memoryStorage = multer.memoryStorage();
const uploadMock = multer({ storage: memoryStorage });

export const uploadAvatar = uploadMock;
export const uploadMedia = uploadMock;

// 2. Mock JSON 上传：不做任何事，只返回假数据
export const uploadJsonToS3 = async (data: any, key: string): Promise<UploadJsonResult> => {
  console.warn('[storage STUB] uploadJsonToS3 called - S3 is disabled');
  // 返回一个假 URL，确保前端不会报错，但图片当然也显示不出来（或者显示数据库里的旧数据）
  return {
    url: '',
    key: key
  };
};

// 3. Mock 删除：不做任何事
export const deleteFromS3 = async (key: string): Promise<void> => {
  console.warn('[storage STUB] deleteFromS3 called - S3 is disabled');
};

export const extractKeyFromUrl = (url: string): string | null => {
  return null;
};