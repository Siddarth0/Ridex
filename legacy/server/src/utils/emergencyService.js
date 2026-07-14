const logger = require("./logger")
const emailService = require("./emailService")
const smsService = require("./smsService")
const notificationService = require("./notificationService")

class EmergencyService {
  constructor() {
    this.emergencyContacts = {
      police: process.env.EMERGENCY_POLICE || "911",
      ambulance: process.env.EMERGENCY_AMBULANCE || "911",
      fire: process.env.EMERGENCY_FIRE || "911",
      support: process.env.EMERGENCY_SUPPORT_PHONE || "+1234567890",
    }

    this.emergencyEmail = process.env.EMERGENCY_EMAIL || "emergency@ridex.com"
  }

  // Handle emergency alert
  async handleEmergencyAlert(alertData) {
    try {
      const {
        userId,
        userName,
        userRole,
        rideId,
        emergencyType,
        location,
        message,
        userPhone,
        userEmail,
        emergencyContacts,
      } = alertData

      // Create emergency record
      const emergencyRecord = {
        id: this.generateEmergencyId(),
        userId,
        userName,
        userRole,
        rideId,
        type: emergencyType,
        location,
        message,
        timestamp: new Date(),
        status: "active",
        responseTime: null,
        resolvedAt: null,
        actions: [],
      }

      // Log emergency
      logger.error("EMERGENCY ALERT", emergencyRecord)

      // Send notifications
      await this.sendEmergencyNotifications(emergencyRecord, {
        userPhone,
        userEmail,
        emergencyContacts,
      })

      // Notify emergency services if critical
      if (this.isCriticalEmergency(emergencyType)) {
        await this.notifyEmergencyServices(emergencyRecord)
      }

      // Store emergency record (in production, save to database)
      await this.storeEmergencyRecord(emergencyRecord)

      return {
        success: true,
        emergencyId: emergencyRecord.id,
        message: "Emergency alert sent successfully",
      }
    } catch (error) {
      logger.error("Emergency alert handling failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Send emergency notifications
  async sendEmergencyNotifications(emergencyRecord, contactInfo) {
    const notifications = []

    try {
      // Send SMS to user's emergency contacts
      if (contactInfo.emergencyContacts && contactInfo.emergencyContacts.length > 0) {
        for (const contact of contactInfo.emergencyContacts) {
          const smsResult = await smsService.sendSMS({
            to: contact.phone,
            message: this.generateEmergencySMS(emergencyRecord, contact.name),
          })
          notifications.push({ type: "sms", contact: contact.phone, success: smsResult.success })
        }
      }

      // Send email to emergency team
      const emailResult = await emailService.sendEmail({
        to: this.emergencyEmail,
        subject: `EMERGENCY ALERT - ${emergencyRecord.type.toUpperCase()}`,
        html: this.generateEmergencyEmail(emergencyRecord),
      })
      notifications.push({ type: "email", contact: this.emergencyEmail, success: emailResult.success })

      // Send push notification to nearby drivers/support staff
      await notificationService.sendEmergencyNotification({
        title: "Emergency Alert",
        body: `Emergency reported: ${emergencyRecord.type}`,
        data: {
          emergencyId: emergencyRecord.id,
          type: "emergency",
          location: emergencyRecord.location,
        },
      })

      // Send SMS to support team
      const supportSMS = await smsService.sendSMS({
        to: this.emergencyContacts.support,
        message: `EMERGENCY: ${emergencyRecord.type} reported by ${emergencyRecord.userName}. Location: ${emergencyRecord.location?.address || "Unknown"}. Emergency ID: ${emergencyRecord.id}`,
      })
      notifications.push({ type: "sms", contact: this.emergencyContacts.support, success: supportSMS.success })

      logger.info("Emergency notifications sent", { emergencyId: emergencyRecord.id, notifications })
    } catch (error) {
      logger.error("Failed to send emergency notifications", error)
    }
  }

  // Notify emergency services for critical emergencies
  async notifyEmergencyServices(emergencyRecord) {
    try {
      if (emergencyRecord.type === "medical") {
        // In production, integrate with local emergency services API
        logger.info("Notifying ambulance services", {
          emergencyId: emergencyRecord.id,
          contact: this.emergencyContacts.ambulance,
        })
      } else if (emergencyRecord.type === "accident") {
        // Notify police and ambulance
        logger.info("Notifying police and ambulance", {
          emergencyId: emergencyRecord.id,
          police: this.emergencyContacts.police,
          ambulance: this.emergencyContacts.ambulance,
        })
      } else if (emergencyRecord.type === "fire") {
        // Notify fire department
        logger.info("Notifying fire department", {
          emergencyId: emergencyRecord.id,
          contact: this.emergencyContacts.fire,
        })
      }

      // In production, make actual API calls to emergency services
      // For now, just log the action
      emergencyRecord.actions.push({
        type: "emergency_services_notified",
        timestamp: new Date(),
        details: `Notified emergency services for ${emergencyRecord.type}`,
      })
    } catch (error) {
      logger.error("Failed to notify emergency services", error)
    }
  }

  // Check if emergency is critical
  isCriticalEmergency(type) {
    const criticalTypes = ["medical", "accident", "fire", "assault", "kidnapping"]
    return criticalTypes.includes(type)
  }

  // Generate emergency SMS message
  generateEmergencySMS(emergencyRecord, contactName) {
    return `EMERGENCY ALERT: ${emergencyRecord.userName} has reported a ${emergencyRecord.type} emergency. Location: ${emergencyRecord.location?.address || "Unknown"}. Time: ${emergencyRecord.timestamp.toLocaleString()}. Emergency ID: ${emergencyRecord.id}. Please contact them immediately or call emergency services.`
  }

  // Generate emergency email
  generateEmergencyEmail(emergencyRecord) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1>🚨 EMERGENCY ALERT</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>Emergency Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Emergency ID:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${emergencyRecord.id}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Type:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${emergencyRecord.type.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">User:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${emergencyRecord.userName} (${emergencyRecord.userRole})</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Time:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${emergencyRecord.timestamp.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Location:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${emergencyRecord.location?.address || "Unknown"}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Ride ID:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${emergencyRecord.rideId || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Message:</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${emergencyRecord.message || "No additional message"}</td>
            </tr>
          </table>
        </div>
        
        <div style="padding: 20px; background-color: #fef2f2; border-left: 4px solid #dc2626;">
          <h3>Immediate Actions Required:</h3>
          <ul>
            <li>Contact the user immediately</li>
            <li>Verify the emergency situation</li>
            <li>Coordinate with local emergency services if needed</li>
            <li>Update emergency status in the system</li>
            <li>Follow up with the user and emergency contacts</li>
          </ul>
        </div>
      </div>
    `
  }

  // Generate emergency ID
  generateEmergencyId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 5)
    return `EMG-${timestamp}-${random}`.toUpperCase()
  }

  // Store emergency record (in production, save to database)
  async storeEmergencyRecord(emergencyRecord) {
    try {
      // In production, save to MongoDB
      logger.info("Emergency record stored", { emergencyId: emergencyRecord.id })
      return true
    } catch (error) {
      logger.error("Failed to store emergency record", error)
      return false
    }
  }

  // Update emergency status
  async updateEmergencyStatus(emergencyId, status, notes = "") {
    try {
      // In production, update in database
      logger.info("Emergency status updated", { emergencyId, status, notes })

      return {
        success: true,
        message: "Emergency status updated successfully",
      }
    } catch (error) {
      logger.error("Failed to update emergency status", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Get emergency types
  getEmergencyTypes() {
    return [
      { value: "medical", label: "Medical Emergency", critical: true },
      { value: "accident", label: "Traffic Accident", critical: true },
      { value: "fire", label: "Fire Emergency", critical: true },
      { value: "assault", label: "Assault/Violence", critical: true },
      { value: "kidnapping", label: "Kidnapping/Abduction", critical: true },
      { value: "harassment", label: "Harassment", critical: false },
      { value: "vehicle_breakdown", label: "Vehicle Breakdown", critical: false },
      { value: "lost", label: "Lost/Stranded", critical: false },
      { value: "suspicious_activity", label: "Suspicious Activity", critical: false },
      { value: "other", label: "Other Emergency", critical: false },
    ]
  }
}

module.exports = new EmergencyService()
