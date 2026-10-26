import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../core/config/index.js';
import { AppError } from '../../middleware/error-handler.js';

const client = config.r2.accountId
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    })
  : null;

const getClient = (): S3Client => {
  if (!client) throw new AppError('File storage is not configured', 503, 'STORAGE_UNAVAILABLE');
  return client;
};

export const putObject = async (objectKey: string, body: Buffer, mimeType: string): Promise<void> => {
  try {
    await getClient().send(new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: objectKey,
      Body: body,
      ContentType: mimeType,
      ContentLength: body.length,
    }));
  } catch {
    throw new AppError('File storage is unavailable', 503, 'STORAGE_UNAVAILABLE');
  }
};

export const deleteObject = async (objectKey: string): Promise<void> => {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: config.r2.bucketName, Key: objectKey }));
  } catch {
    throw new AppError('File storage is unavailable', 503, 'STORAGE_UNAVAILABLE');
  }
};

export const signDownload = async (objectKey: string): Promise<{ url: string; urlExpiresAt: Date }> => {
  const expiresIn = 15 * 60;
  const now = new Date();
  try {
    const url = await getSignedUrl(
      getClient(),
      new GetObjectCommand({ Bucket: config.r2.bucketName, Key: objectKey }),
      { expiresIn, signingDate: now },
    );
    return { url, urlExpiresAt: new Date(now.getTime() + expiresIn * 1000) };
  } catch {
    throw new AppError('File storage is unavailable', 503, 'STORAGE_UNAVAILABLE');
  }
};

export const verifyObject = async (objectKey: string, size: number, mimeType: string): Promise<void> => {
  try {
    const object = await getClient().send(new HeadObjectCommand({ Bucket: config.r2.bucketName, Key: objectKey }));
    if (object.ContentLength !== size || object.ContentType !== mimeType) {
      throw new Error('Object metadata does not match');
    }
  } catch {
    throw new AppError('Could not verify migrated R2 object', 503, 'STORAGE_UNAVAILABLE');
  }
};
