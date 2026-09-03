import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { EnvironmentVariables } from '../config/environment';

const SIGNED_URL_EXPIRY_SECONDS = 900;

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  readonly bucketName: string;

  constructor(
    private configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.bucketName = this.configService.get('AWS_S3_BUCKET_NAME', {
      infer: true,
    });
    this.client = new S3Client({
      region: this.configService.get('AWS_REGION', { infer: true }),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID', {
          infer: true,
        }),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY', {
          infer: true,
        }),
      },
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getSignedUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
      { expiresIn: SIGNED_URL_EXPIRY_SECONDS },
    );
  }
}
