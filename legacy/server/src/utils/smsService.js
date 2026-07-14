import twilio from "twilio"

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

// SMS templates
export const smsTemplates = {
  phoneVerification: (code) => `Your RideX verification code is: ${code}. This code will expire in 10 minutes.`,

  rideAccepted: (data) =>
    `Your RideX ride has been accepted! Driver: ${data.driverName}, Vehicle: ${data.vehicle}, ETA: ${data.eta} mins. Track your ride in the app.`,

  driverArrived: (data) =>
    `Your RideX driver ${data.driverName} has arrived at the pickup location. Vehicle: ${data.vehicle}.`,

  rideStarted: (data) => `Your RideX ride has started. Destination: ${data.destination}. Have a safe journey!`,

  rideCompleted: (data) =>
    `Your RideX ride is complete. Fare: ৳${data.fare}. Thank you for choosing RideX! Please rate your driver.`,

  rideCancelled: (data) =>
    `Your RideX ride has been cancelled. ${data.reason ? `Reason: ${data.reason}.` : ""} You can book another ride anytime.`,

  driverStatusUpdate: (status) =>
    `Your RideX driver application status has been updated to: ${status}. Check the app for more details.`,

  emergencyAlert: (data) =>
    `EMERGENCY ALERT: RideX user ${data.userName} has triggered an emergency alert. Location: ${data.location}. Ride ID: ${data.rideId}`,

  paymentFailed: (data) =>
    `Payment failed for your RideX ride (৳${data.amount}). Please update your payment method in the app.`,

  promoCode: (data) =>
    `🎉 New RideX promo code: ${data.code}! Get ${data.discount}% off your next ride. Valid until ${data.expiry}.`,
}

// Send SMS function
export const sendSMS = async ({ to, message, template, data }) => {
  try {
    let smsContent = message

    if (template && smsTemplates[template]) {
      smsContent = smsTemplates[template](data)
    }

    const result = await client.messages.create({
      body: smsContent,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    })

    console.log("SMS sent successfully:", result.sid)
    return result
  } catch (error) {
    console.error("SMS sending failed:", error)
    throw error
  }
}

// Send bulk SMS
export const sendBulkSMS = async (messages) => {
  const results = []

  for (const msg of messages) {
    try {
      const result = await sendSMS(msg)
      results.push({ success: true, sid: result.sid, to: msg.to })
    } catch (error) {
      results.push({ success: false, error: error.message, to: msg.to })
    }
  }

  return results
}

// Generate and send verification code
export const sendVerificationCode = async (phoneNumber) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString() // 6-digit code

    await sendSMS({
      to: phoneNumber,
      template: "phoneVerification",
      data: code,
    })

    return {
      success: true,
      code, // In production, you'd store this in database/cache, not return it
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    }
  } catch (error) {
    console.error("Failed to send verification code:", error)
    throw error
  }
}

// Verify phone number with code
export const verifyPhoneCode = async (phoneNumber, code, storedCode, expiresAt) => {
  try {
    if (new Date() > expiresAt) {
      return { success: false, message: "Verification code has expired" }
    }

    if (code !== storedCode) {
      return { success: false, message: "Invalid verification code" }
    }

    return { success: true, message: "Phone number verified successfully" }
  } catch (error) {
    console.error("Phone verification failed:", error)
    throw error
  }
}

// Send ride notifications
export const sendRideNotification = async (phoneNumber, template, data) => {
  try {
    await sendSMS({
      to: phoneNumber,
      template,
      data,
    })
    return { success: true }
  } catch (error) {
    console.error("Failed to send ride notification:", error)
    return { success: false, error: error.message }
  }
}

// Send emergency alert to multiple numbers
export const sendEmergencyAlert = async (phoneNumbers, data) => {
  const messages = phoneNumbers.map((phone) => ({
    to: phone,
    template: "emergencyAlert",
    data,
  }))

  return await sendBulkSMS(messages)
}

// Format phone number for international use
export const formatPhoneNumber = (phoneNumber, countryCode = "+880") => {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, "")

  // If it starts with country code digits, don't add country code
  if (cleaned.startsWith("880")) {
    return "+" + cleaned
  }

  // If it starts with 0, remove it and add country code
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1)
  }

  return countryCode + cleaned
}

// Validate phone number format
export const validatePhoneNumber = (phoneNumber) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  return phoneRegex.test(phoneNumber)
}

// Check Twilio account balance
export const checkBalance = async () => {
  try {
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
    return {
      balance: account.balance,
      currency: account.currency,
    }
  } catch (error) {
    console.error("Failed to check Twilio balance:", error)
    throw error
  }
}

// Get SMS delivery status
export const getSMSStatus = async (messageSid) => {
  try {
    const message = await client.messages(messageSid).fetch()
    return {
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent,
      dateUpdated: message.dateUpdated,
    }
  } catch (error) {
    console.error("Failed to get SMS status:", error)
    throw error
  }
}

// ESM named exports used; no CommonJS exports
