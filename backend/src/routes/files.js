import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { minioClient, BUCKET_NAME, initializeBucket } from '../config/minio.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Initialize MinIO bucket
initializeBucket().catch(console.error);

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default
    },
    fileFilter: (req, file, cb) => {
        // Allow common file types
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'application/zip'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'), false);
        }
    }
});

// POST /api/files/upload
router.post('/upload', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const file = req.file;
        const fileId = uuidv4();
        const ext = file.originalname.split('.').pop();
        const storagePath = `${req.user.id}/${fileId}.${ext}`;

        // Upload to MinIO
        await minioClient.putObject(
            BUCKET_NAME,
            storagePath,
            file.buffer,
            file.size,
            { 'Content-Type': file.mimetype }
        );

        // Save metadata to database
        const fileRecord = await prisma.file.create({
            data: {
                id: fileId,
                uploaderId: req.user.id,
                filename: `${fileId}.${ext}`,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: BigInt(file.size),
                storagePath
            }
        });

        res.status(201).json({
            file: {
                id: fileRecord.id,
                filename: fileRecord.filename,
                originalName: fileRecord.originalName,
                mimeType: fileRecord.mimeType,
                size: Number(fileRecord.size)
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/files/:id
router.get('/:id', async (req, res, next) => {
    try {
        const file = await prisma.file.findUnique({
            where: { id: req.params.id }
        });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Generate presigned URL (valid for 1 hour)
        const url = await minioClient.presignedGetObject(
            BUCKET_NAME,
            file.storagePath,
            60 * 60
        );

        res.json({
            url,
            file: {
                id: file.id,
                filename: file.filename,
                originalName: file.originalName,
                mimeType: file.mimeType,
                size: Number(file.size)
            }
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/files/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const file = await prisma.file.findUnique({
            where: { id: req.params.id }
        });

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        if (file.uploaderId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this file' });
        }

        // Delete from MinIO
        await minioClient.removeObject(BUCKET_NAME, file.storagePath);

        // Delete from database
        await prisma.file.delete({
            where: { id: req.params.id }
        });

        res.json({ message: 'File deleted' });
    } catch (error) {
        next(error);
    }
});

export default router;
