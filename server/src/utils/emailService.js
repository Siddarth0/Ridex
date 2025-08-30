import nodemailer from "nodemailer"

// Create Ethereal transporter (for development/testing)
const createEtherealTransporter = async () => {
  const testAccount = await nodemailer.createTestAccount()
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  })
}

// Create transporter (SMTP or Ethereal)
const createTransporter = async () => {
  const useEthereal =
    process.env.EMAIL_PROVIDER === "ethereal" ||
    (!process.env.EMAIL_HOST && !process.env.EMAIL_USER && process.env.NODE_ENV !== "production")

  if (useEthereal) {
    return await createEtherealTransporter()
  }

  const secureFlag = String(process.env.EMAIL_SECURE).toLowerCase() === "true" || Number(process.env.EMAIL_PORT) === 465

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: secureFlag, // true for 465, false for 587/STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

// Email templates
export const emailTemplates = {
  emailVerification: (data) => ({
    subject: "Verify Your RideX Account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to RideX!</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>Hi ${data.name},</h2>
          <p>Thank you for signing up with RideX! Please verify your email address to complete your registration.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationLink}" 
               style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${data.verificationLink}</p>
          <p>This link will expire in 24 hours.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            If you didn't create a RideX account, please ignore this email.
          </p>
        </div>
      </div>
    `,
  }),

  passwordReset: (data) => ({
    subject: "Reset Your RideX Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ef4444; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset Request</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>Hi ${data.name},</h2>
          <p>We received a request to reset your RideX account password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetLink}" 
               style="background-color: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${data.resetLink}</p>
          <p>This link will expire in 10 minutes for security reasons.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
      </div>
    `,
  }),

  driverWelcome: (data) => ({
    subject: "Welcome to RideX Driver Program",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to RideX Driver Program!</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>Hi ${data.name},</h2>
          <p>Thank you for applying to become a RideX driver! Your application has been received and is currently under review.</p>
          
          <h3>Next Steps:</h3>
          <ol>
            <li>Verify your email address by clicking the link below</li>
            <li>Upload required documents in your driver dashboard</li>
            <li>Complete background verification</li>
            <li>Attend driver orientation (if required)</li>
          </ol>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationLink}" 
               style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email & Continue
            </a>
          </div>

          <p>We'll notify you once your application has been reviewed. This typically takes 2-3 business days.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Questions? Contact our driver support team at driver-support@ridex.com
          </p>
        </div>
      </div>
    `,
  }),

  rideCompleted: (data) => ({
    subject: "Ride Completed - Thank You!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Ride Completed!</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>Hi ${data.riderName},</h2>
          <p>Thank you for choosing RideX! Your ride has been completed successfully.</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Ride Details:</h3>
            <p><strong>From:</strong> ${data.pickup}</p>
            <p><strong>To:</strong> ${data.destination}</p>
            <p><strong>Driver:</strong> ${data.driverName}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Fare:</strong> ৳${data.fare}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.ratingLink}" 
               style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Rate Your Driver
            </a>
          </div>

          <p>Your feedback helps us maintain the quality of our service.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Need help? Contact us at support@ridex.com or call +880-1234-567890
          </p>
        </div>
      </div>
    `,
  }),
}

// Send email function
export const sendEmail = async ({ to, subject, template, data, html, text }) => {
  try {
  const transporter = await createTransporter()

    let emailContent = {}

    if (template && emailTemplates[template]) {
      emailContent = emailTemplates[template](data)
    } else if (html || text) {
      emailContent = { subject, html, text }
    } else {
      throw new Error("No email content provided")
    }

    const mailOptions = {
      from: `"RideX" <${process.env.EMAIL_USER}>`,
      to,
      subject: emailContent.subject || subject,
      html: emailContent.html,
      text: emailContent.text,
    }

    const result = await transporter.sendMail(mailOptions)
    console.log("Email sent successfully:", result.messageId)
    const preview = nodemailer.getTestMessageUrl(result)
    if (preview) {
      console.log("Preview URL:", preview)
    }
    return result
  } catch (error) {
    console.error("Email sending failed:", error)
    throw error
  }
}

// Send bulk emails
export const sendBulkEmails = async (emails) => {
  const results = []
  const transporter = await createTransporter()

  for (const email of emails) {
    try {
      const result = await sendEmail(email)
      results.push({ success: true, messageId: result.messageId, email: email.to })
    } catch (error) {
      results.push({ success: false, error: error.message, email: email.to })
    }
  }

  return results
}

// Verify email configuration
export const verifyEmailConfig = async () => {
  try {
  const transporter = await createTransporter()
    await transporter.verify()
    console.log("Email configuration verified successfully")
    return true
  } catch (error) {
    console.error("Email configuration verification failed:", error)
    return false
  }
}

// ESM named exports used; no CommonJS exports
