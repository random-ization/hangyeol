import { Request, Response } from 'express';

export const handleFileUpload = (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // multer-s3 会在 req.file 中添加 location 属性 (即文件的 CDN 链接)
    const fileData = req.file as any;

    res.json({
      success: true,
      url: fileData.location, // 这是最重要的，前端要存这个 URL
      key: fileData.key,
      mimetype: fileData.mimetype
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
};

export const handlePresign = (req: Request, res: Response) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    // Dynamic import to avoid circular dependency if any, though import should be fine
    const { getPresignedUrl } = require('../lib/storage');

    // Generate key: uploads/presigned/{timestamp}-{filename}
    // For TOPIK questions, maybe we want specific folder?
    // Let's use a generic 'uploads' folder for now, or detect type
    const folder = req.body.folder || 'uploads';
    // Validate folder to prevent path traversal
    if (!['uploads', 'exams', 'avatars'].includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder' });
    }

    const key = `${folder}/${Date.now()}-${filename}`;
    const url = getPresignedUrl(key, contentType || 'application/json');

    res.json({
      success: true,
      url, // Upload URL (PUT)
      key,
      publicUrl: url.split('?')[0] // Public read URL
    });
  } catch (error: unknown) {
    console.error('Presign Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate presigned URL', details: message });
  }
};