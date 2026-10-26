import { File, IFile } from '../../models/File.model.js';
import { ServiceTicket } from '../../models/ServiceTicket.model.js';
import { AppError } from '../../middleware/error-handler.js';
import { generateFileKey } from '../../lib/upload/key-generator.js';
import { deleteObject, putObject, signDownload } from '../../lib/storage/r2.js';
import { IMAGE_LIMIT } from './upload.middleware.js';

export const formatUpload = async (file: IFile) => {
  if (!file.objectKey) {
    throw new AppError('This file must be migrated to R2', 409, 'UPLOAD_MIGRATION_REQUIRED');
  }
  return {
    key: file.key,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    category: file.category,
    ...await signDownload(file.objectKey),
    uploadedAt: file.createdAt,
  };
};

export const uploadFile = async (file: Express.Multer.File, userId: string) => {
  if (!file.size) throw new AppError('File must not be empty', 400, 'INVALID_UPLOAD');
  const category = file.mimetype.startsWith('image/') ? 'images' : 'documents';
  if (category === 'images' && file.size > IMAGE_LIMIT) {
    throw new AppError('Image exceeds the 5 MiB limit', 413, 'UPLOAD_TOO_LARGE');
  }
  const key = generateFileKey(category);
  const objectKey = `${category}/${userId}/${key}`;

  await putObject(objectKey, file.buffer, file.mimetype);
  let download;
  let record;
  try {
    download = await signDownload(objectKey);
    record = await File.create({
      key, objectKey, category, uploadedBy: userId,
      originalName: file.originalname, mimeType: file.mimetype, size: file.size,
    });
  } catch (error) {
    try {
      await deleteObject(objectKey);
    } catch {
      console.error('Failed to remove orphaned R2 upload', { key, objectKey });
    }
    throw error;
  }
  return {
    key, originalName: record.originalName, mimeType: record.mimeType,
    size: record.size, category, ...download, uploadedAt: record.createdAt,
  };
};

const findOwnedUpload = async (key: string, userId: string, isAdmin: boolean) => {
  const file = await File.findOne({ key });
  if (!file) throw new AppError('File not found', 404, 'UPLOAD_NOT_FOUND');
  if (!isAdmin && file.uploadedBy.toString() !== userId) {
    throw new AppError('You cannot access this file', 403, 'UPLOAD_FORBIDDEN');
  }
  return file;
};

export const getUpload = async (key: string, userId: string, isAdmin: boolean) => {
  const file = await findOwnedUpload(key, userId, isAdmin);
  if (file.deleting) throw new AppError('File deletion is in progress', 409, 'UPLOAD_DELETING');
  return formatUpload(file);
};

export const deleteUpload = async (key: string, userId: string, isAdmin: boolean): Promise<void> => {
  const file = await findOwnedUpload(key, userId, isAdmin);
  if (!file.objectKey) throw new AppError('This file must be migrated to R2', 409, 'UPLOAD_MIGRATION_REQUIRED');
  if (await ServiceTicket.exists({ 'attachments.key': key })) {
    throw new AppError('Detach this file from tickets before deleting it', 409, 'UPLOAD_IN_USE');
  }
  // Attachment increments and this claim update the same document atomically.
  const claimed = await File.findOneAndUpdate(
    { _id: file._id, $or: [{ referenceCount: 0 }, { referenceCount: { $exists: false } }] },
    { $set: { deleting: true } },
    { new: true },
  );
  if (!claimed) throw new AppError('File is attached or being attached to a ticket', 409, 'UPLOAD_IN_USE');
  await deleteObject(claimed.objectKey);
  await File.deleteOne({ _id: claimed._id, deleting: true });
};
