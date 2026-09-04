import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Service } from './s3.service';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3Service', () => {
  let service: S3Service;
  const mockSend = jest.fn();

  const configValues: Record<string, string> = {
    AWS_S3_BUCKET_NAME: 'test-bucket',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'fake-access-key-id',
    AWS_SECRET_ACCESS_KEY: 'fake-secret-access-key',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (S3Client as unknown as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configValues[key]),
          },
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('sends a PutObjectCommand for the given bucket/key/body/contentType', async () => {
      const body = Buffer.from('fake-image-bytes');

      await service.upload('products/1/photo.png', body, 'image/png');

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'products/1/photo.png',
        Body: body,
        ContentType: 'image/png',
      });
    });
  });

  describe('getSignedUrl', () => {
    it('builds a GetObjectCommand for the key and returns the signed URL', async () => {
      // Arrange — getSignedUrl's return value matters here, so we set it
      // before acting. Without this line, the mock returns undefined by
      // default, and the assert below would fail against undefined instead
      // of your real logic.
      (getSignedUrl as jest.Mock).mockResolvedValue(
        'https://signed-url.example.com/photo.png',
      );

      // Act
      const url = await service.getSignedUrl('products/1/photo.png');

      // Assert
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'products/1/photo.png',
      });
      expect(url).toBe('https://signed-url.example.com/photo.png');
    });
  });
});
