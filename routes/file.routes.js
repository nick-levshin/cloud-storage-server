const Router = require('express');
const router = new Router();
const authMiddleware = require('../middleware/auth.middleware');
const fileController = require('../controllers/fileController');

router.post('', authMiddleware, fileController.createDir);
router.post('/upload', authMiddleware, fileController.uploadFile);
router.get('/download', authMiddleware, fileController.downloadFile);
router.delete('/', authMiddleware, fileController.deleteFile);
router.get('/search', authMiddleware, fileController.searchFiles);
router.post('/avatar', authMiddleware, fileController.uploadAvatar);
router.delete('/avatar', authMiddleware, fileController.deleteAvatar);
router.get('', authMiddleware, fileController.getFiles);

module.exports = router;
