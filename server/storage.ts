import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

class StorageService {
  private s3Client: S3Client | null = null;
  private isMinioConfigured = false;
  private bucket: string;
  private memoryFiles = new Map<string, { buffer: Buffer; mimeType: string }>();

  constructor() {
    this.bucket = process.env.MINIO_BUCKET || 'eventops-uploads';
    this.init();
  }

  private init() {
    const endpoint = process.env.MINIO_ENDPOINT;
    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;

    if (endpoint && accessKey && secretKey) {
      try {
        this.s3Client = new S3Client({
          endpoint,
          region: process.env.MINIO_REGION || 'us-east-1',
          credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
          },
          forcePathStyle: true, // Required for MinIO
        });
        this.isMinioConfigured = true;
        console.log('✅ MinIO S3 Object Storage configured for bucket:', this.bucket);
      } catch (err) {
        console.warn('⚠️ MinIO configuration error:', (err as Error).message);
        this.isMinioConfigured = false;
      }
    } else {
      console.log('ℹ️ MinIO not configured - using persistent local storage for uploads');
    }
  }

  public async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (this.isMinioConfigured && this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
          })
        );
        const publicBase = process.env.MINIO_PUBLIC_URL || process.env.MINIO_ENDPOINT || '';
        return `${publicBase}/${this.bucket}/${key}`;
      } catch (e) {
        console.warn('⚠️ MinIO upload failed, fallback to local storage:', (e as Error).message);
      }
    }

    // Fallback: save to memory and serve via `/api/files/${key}`
    const dir = path.join(process.cwd(),'data','uploads'); fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,key),buffer); fs.writeFileSync(path.join(dir,key+'.json'),JSON.stringify({mimeType}));
    return `/api/files/${encodeURIComponent(key)}`;
  }

  public async getFile(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (this.isMinioConfigured && this.s3Client) {
      try {
        const res = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
          })
        );
        if (res.Body) {
          const bytes = await res.Body.transformToByteArray();
          return {
            buffer: Buffer.from(bytes),
            mimeType: res.ContentType || 'application/octet-stream',
          };
        }
      } catch (e) {}
    }

    if(path.basename(key) !== key) return null;
 const file = path.join(process.cwd(),'data','uploads',key);
 if(!fs.existsSync(file) || !fs.existsSync(file+'.json')) return null;
 return {buffer:fs.readFileSync(file),mimeType:JSON.parse(fs.readFileSync(file+'.json','utf8')).mimeType};
  }
}

export const storage = new StorageService();
