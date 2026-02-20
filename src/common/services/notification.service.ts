import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        // In a real implementation, this would use a mailer like nodemailer
        this.logger.log(`Sending email to ${to}`);
        this.logger.log(`Subject: ${subject}`);
        this.logger.log(`Body: ${body}`);

        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}
