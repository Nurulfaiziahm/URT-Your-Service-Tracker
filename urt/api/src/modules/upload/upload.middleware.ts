import multer from 'multer';
import { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../../middleware/error-handler.js';

export const IMAGE_LIMIT = 5 * 1024 * 1024;
export const FILE_LIMIT = 10 * 1024 * 1024;
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const parseUpload = multer({
  storage: multer.memoryStorage(),
  // Busboy emits partsLimit when the limit is reached, including the final part.
  limits: { fileSize: FILE_LIMIT, files: 1, fields: 0, parts: 2 },
  fileFilter: (_req, file, callback) => {
    file.mimetype = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
    if (!imageTypes.has(file.mimetype) && file.mimetype !== 'application/pdf') {
      callback(new AppError('Only JPEG, PNG, WebP, GIF and PDF files are allowed', 415, 'INVALID_FILE_TYPE'));
      return;
    }
    callback(null, true);
  },
}).single('file');

export const requireMultipart: RequestHandler = (req, _res, next) => {
  if (!req.is('multipart/form-data')) {
    next(new AppError('Send one file as multipart/form-data using the file field', 400, 'INVALID_UPLOAD'));
    return;
  }
  next();
};

export const uploadErrorHandler: ErrorRequestHandler = (error: unknown, _req, _res, next) => {
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    next(new AppError(
      tooLarge ? 'File exceeds the 10 MiB upload limit' : 'Send exactly one file and no other form fields',
      tooLarge ? 413 : 400,
      tooLarge ? 'UPLOAD_TOO_LARGE' : 'INVALID_UPLOAD',
    ));
    return;
  }
  // Busboy reports malformed multipart requests as ordinary errors.
  if (error instanceof Error && !(error instanceof AppError)) {
    next(new AppError('Invalid multipart upload', 400, 'INVALID_UPLOAD'));
    return;
  }
  next(error);
};
