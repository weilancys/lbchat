import * as Minio from 'minio';

export const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

export const BUCKET_NAME = process.env.MINIO_BUCKET || 'lbchat-files';

// Initialize bucket
export const initializeBucket = async () => {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME);
            console.log(`✅ MinIO bucket '${BUCKET_NAME}' created`);
        } else {
            console.log(`✅ MinIO bucket '${BUCKET_NAME}' exists`);
        }
    } catch (err) {
        console.error('MinIO initialization error:', err);
        throw err;
    }
};
