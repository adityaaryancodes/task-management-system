import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/env.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '../..');
const localUploadsRoot = path.join(serverRoot, 'uploads', 'screenshots');

function isPlaceholder(value) {
  if (!value) return true;
  const v = String(value).toLowerCase();
  return v.includes('replace_me') || v.includes('your-screenshot-bucket');
}

export const useLocalScreenshotStorage =
  process.env.SCREENSHOT_STORAGE === 'local' ||
  isPlaceholder(config.awsBucket) ||
  isPlaceholder(config.awsAccessKeyId) ||
  isPlaceholder(config.awsSecretAccessKey);

export const s3 = new S3Client({
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey
  }
});

export async function uploadToS3({ key, body, contentType }) {
  if (useLocalScreenshotStorage) {
    const fullPath = path.join(localUploadsRoot, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, body);
    return `local://${key}`;
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: config.awsBucket,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
  return `s3://${config.awsBucket}/${key}`;
}

export async function getScreenshotSignedUrl(key, expiresIn = 300) {
  if (useLocalScreenshotStorage) {
    return null;
  }

  const cmd = new GetObjectCommand({
    Bucket: config.awsBucket,
    Key: key
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function deleteScreenshotObject(key, storageUrl = '') {
  if (!key) return;

  if (useLocalScreenshotStorage || String(storageUrl).startsWith('local://')) {
    const fullPath = getLocalScreenshotPath(key);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      if (err?.code !== 'ENOENT') {
        throw err;
      }
    }
    return;
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: config.awsBucket,
      Key: key
    })
  );
}

export function getLocalScreenshotPath(key) {
  return path.join(localUploadsRoot, key);
}
