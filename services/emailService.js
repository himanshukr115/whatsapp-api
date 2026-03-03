// Email Service - Postmark/Nodemailer for invoices and verification

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // --- NEW: Account Verification Email ---
  async sendVerificationEmail(userEmail, userName, verificationUrl) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM_EMAIL,
        to: userEmail,
        subject: 'Verify Your Account - WhatsApp SaaS',
        html: `
                <!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
        .email-container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .header { background-color: #075E54; padding: 30px; text-align: center; color: #ffffff; }
        .content { padding: 40px 30px; line-height: 1.6; color: #333333; }
        .user-name { color: #075E54; font-weight: bold; }
        .button-container { text-align: center; margin: 35px 0; }
        .verify-button { background-color: #25D366; color: #ffffff !important; padding: 14px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.3s ease; }
        .footer { background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #eeeeee; }
        .link-text { word-break: break-all; color: #34b7f1; font-size: 13px; }
        .company-name { color: #075E54; font-weight: bold; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h2 style="margin:0;">Confirm Your Account</h2>
        </div>

        <div class="content">
            <p>Hello <span class="user-name">${userName}</span>,</p>
            <p>Welcome to our platform! We are excited to have you. To start using your AI-powered tools and managing your WhatsApp automation, please confirm your email address.</p>
            
            <div class="button-container">
                <a href="${verificationUrl}" class="verify-button">
                    Verify Email Address
                </a>
            </div>

            <p style="margin-bottom: 5px;"><strong>If the button doesn't work,</strong> please copy and paste this link into your browser:</p>
            <p class="link-text">${verificationUrl}</p>
        </div>

        <div class="footer">
            <p>If you did not sign up for an account, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} <span class="company-name">WhatsApp SaaS</span>. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
            `
      };
      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${userEmail}`);
    } catch (error) {
      console.error('Email Error (Verification):', error);
      throw error;
    }
  }

  // --- Existing Methods ---
  async sendInvoice(userEmail, invoiceData) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM_EMAIL,
        to: userEmail,
        subject: `Invoice #${invoiceData.invoiceId}`,
        html: this.generateInvoiceHTML(invoiceData),
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Invoice sent to ${userEmail}`);
    } catch (error) {
      console.error('Error sending invoice:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM_EMAIL,
        to: userEmail,
        subject: 'Welcome to AI Blog SaaS!',
        html: `<h1>Welcome, ${userName}!</h1><p>Thank you for signing up. Get started with your free 100 tokens.</p>`,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${userEmail}`);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  generateInvoiceHTML(invoiceData) {
    return `
      <html>
        <body>
          <h1>Invoice #${invoiceData.invoiceId}</h1>
          <p>Amount: ₹${invoiceData.amount / 100}</p>
          <p>Date: ${new Date(invoiceData.createdAt).toLocaleDateString()}</p>
          <p>Thank you for your purchase!</p>
        </body>
      </html>
    `;
  }
}

// Export a single instance of the class
module.exports = new EmailService();