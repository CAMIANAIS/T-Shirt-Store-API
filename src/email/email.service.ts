import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/environment';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  constructor(
    private configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST', { infer: true }),
      port: this.configService.get('EMAIL_PORT', { infer: true }),
      auth: {
        user: this.configService.get('EMAIL_USER', { infer: true }),
        pass: this.configService.get('EMAIL_PASSWORD', { infer: true }),
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM', { infer: true }),
      to,
      subject,
      html,
    });
  }
}
