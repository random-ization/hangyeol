import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getUsers, updateUser, deleteUser } from '../controllers/admin.user.controller';

const router = Router();

// 所有 admin 路由都需要登录，控制器内部再检查 role 是否为 ADMIN
router.use(authenticate);

router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// S3 连接测试 (仅限调试用)
router.get('/test-s3', async (req, res) => {
    // @ts-ignore
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Require Admin' });
    }

    try {
        const { testS3Connection } = await import('../lib/storage');
        const result = await testS3Connection();
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (e: any) {
        res.status(500).json({ success: false, message: e.message });
    }
});

export default router;
