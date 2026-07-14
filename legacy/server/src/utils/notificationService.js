// Notification service for handling push notifications, email, and SMS
// This service integrates with Firebase Cloud Messaging (FCM) for push notifications
// and coordinates with email and SMS services for comprehensive notifications

const admin = require("firebase-admin")
const { sendEmail } = require("./emailService")
const { sendSMS } = require("./smsService")

// Initialize Firebase Admin SDK
// You'll need to add your Firebase service account key
const serviceAccount = require("../config/firebase-service-account.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

// Send push notification
const sendPushNotification = async (tokens, notification, data = {}) => {
  try {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || "/icons/ridex-icon.png",
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      tokens: Array.isArray(tokens) ? tokens : [tokens],
    }

    const response = await admin.messaging().sendMulticast(message)
    console.log("Push notification sent successfully:", response.successCount)
    return response
  } catch (error) {
    console.error("Push notification failed:", error)
    throw error
  }
}

// Send comprehensive notification (push + email + SMS)
const sendNotification = async (user, notification, channels = ["push"]) => {
  const results = {}

  try {
    // Send push notification
    if (channels.includes("push") && user.fcmTokens && user.fcmTokens.length > 0) {
      results.push = await sendPushNotification(user.fcmTokens, notification)
    }

    // Send email notification
    if (channels.includes("email") && user.preferences?.notifications?.email) {
      results.email = await sendEmail({
        to: user.email,
        subject: notification.title,
        html: notification.emailTemplate || notification.body,
      })
    }

    // Send SMS notification
    if (channels.includes("sms") && user.preferences?.notifications?.sms) {
      results.sms = await sendSMS({
        to: user.phone,
        message: notification.smsMessage || notification.body,
      })
    }

    return results
  } catch (error) {
    console.error("Notification sending failed:", error)
    throw error
  }
}

module.exports = {
  sendPushNotification,
  sendNotification,
}
