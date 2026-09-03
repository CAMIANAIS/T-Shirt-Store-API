import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, unknown> = {
                EMAIL_HOST: 'smtp.ethereal.email',
                EMAIL_PORT: 587,
                EMAIL_USER: 'test@ethereal.email',
                EMAIL_PASSWORD: 'fake-password-for-tests',
                EMAIL_FROM: 'T-Shirt Store <noreply@tshirtstore.test>',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sendEmail calls the transporter with the right message shape', async () => {
    // Arrange — the transporter is built for real in the constructor
    // (from the mocked config above), so spy on its sendMail directly
    // rather than trying to mock nodemailer itself.
    const sendMailSpy = jest
      .spyOn(service['transporter'], 'sendMail')
      .mockResolvedValue(undefined);

    // Act
    await service.sendEmail(
      'client@example.com',
      'Reset your password',
      'Your token is: abc123',
    );

    // Assert — your turn. Was sendMail called with `from` matching
    // EMAIL_FROM, and `to`/`subject`/`html` matching what you passed in?
    expect(sendMailSpy).toHaveBeenCalledWith({
      from: 'T-Shirt Store <noreply@tshirtstore.test>',
      to: 'client@example.com',
      subject: 'Reset your password',
      html: 'Your token is: abc123',
    });
  });
});
