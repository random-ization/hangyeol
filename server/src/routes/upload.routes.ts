import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { uploadMedia } from '../lib/storage';
import { handleFileUpload, handlePresign } from '../controllers/upload.controller';

const router = Router();

// 所有上传都需要登录
router.use(authenticate);

// 通用媒体上传接口 (用于考试图片、听力音频等)
// 接口地址: POST /api/upload
router.post('/', uploadMedia.single('file'), handleFileUpload);

// 获取 Presigned URL (用于前端直传)
// 接口地址: POST /api/upload/presign
router.post('/presign', handlePresign);

export default router;