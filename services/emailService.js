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
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h1>Hello ${userName},</h1>
                    <p>Thank you for signing up! Please verify your email address to activate your account.</p>
                    <a href="${verificationUrl}" style="background: #25D366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Verify Email Address
                    </a>
                    <p>If the button doesn't work, copy and paste this link: ${verificationUrl}</p>
                </div>
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