const logger = require("./logger")

class PromoService {
  constructor() {
    // In production, these would be stored in database
    this.promoCodes = new Map()
    this.userPromoUsage = new Map()
  }

  // Create new promo code
  async createPromoCode(promoData) {
    try {
      const {
        code,
        type, // 'percentage', 'fixed', 'free_ride'
        value,
        description,
        maxUses,
        maxUsesPerUser,
        minOrderAmount,
        validFrom,
        validUntil,
        applicableRideTypes,
        applicableCities,
        isActive = true,
      } = promoData

      // Validate promo code
      if (this.promoCodes.has(code.toUpperCase())) {
        throw new Error("Promo code already exists")
      }

      const promo = {
        code: code.toUpperCase(),
        type,
        value,
        description,
        maxUses: maxUses || null,
        maxUsesPerUser: maxUsesPerUser || 1,
        minOrderAmount: minOrderAmount || 0,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        applicableRideTypes: applicableRideTypes || ["standard", "premium", "shared"],
        applicableCities: applicableCities || [],
        isActive,
        currentUses: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      this.promoCodes.set(code.toUpperCase(), promo)

      logger.info("Promo code created", { code: promo.code, type: promo.type, value: promo.value })

      return {
        success: true,
        promoCode: promo,
      }
    } catch (error) {
      logger.error("Failed to create promo code", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Validate promo code
  async validatePromoCode(code, userId, rideData) {
    try {
      const promoCode = code.toUpperCase()
      const promo = this.promoCodes.get(promoCode)

      if (!promo) {
        return {
          valid: false,
          error: "Invalid promo code",
        }
      }

      // Check if promo is active
      if (!promo.isActive) {
        return {
          valid: false,
          error: "Promo code is not active",
        }
      }

      // Check validity dates
      const now = new Date()
      if (now < promo.validFrom || now > promo.validUntil) {
        return {
          valid: false,
          error: "Promo code has expired",
        }
      }

      // Check max uses
      if (promo.maxUses && promo.currentUses >= promo.maxUses) {
        return {
          valid: false,
          error: "Promo code usage limit reached",
        }
      }

      // Check user usage limit
      const userUsage = this.getUserPromoUsage(userId, promoCode)
      if (userUsage >= promo.maxUsesPerUser) {
        return {
          valid: false,
          error: "You have already used this promo code",
        }
      }

      // Check minimum order amount
      if (rideData.estimatedFare < promo.minOrderAmount) {
        return {
          valid: false,
          error: `Minimum order amount is $${promo.minOrderAmount}`,
        }
      }

      // Check applicable ride types
      if (!promo.applicableRideTypes.includes(rideData.rideType)) {
        return {
          valid: false,
          error: "Promo code not applicable for this ride type",
        }
      }

      // Check applicable cities
      if (promo.applicableCities.length > 0 && !promo.applicableCities.includes(rideData.city)) {
        return {
          valid: false,
          error: "Promo code not applicable in this city",
        }
      }

      // Calculate discount
      const discount = this.calculateDiscount(promo, rideData.estimatedFare)

      return {
        valid: true,
        promo: {
          code: promo.code,
          type: promo.type,
          value: promo.value,
          description: promo.description,
          discount,
          finalAmount: Math.max(0, rideData.estimatedFare - discount),
        },
      }
    } catch (error) {
      logger.error("Failed to validate promo code", error)
      return {
        valid: false,
        error: "Failed to validate promo code",
      }
    }
  }

  // Apply promo code to ride
  async applyPromoCode(code, userId, rideId, originalAmount) {
    try {
      const promoCode = code.toUpperCase()
      const promo = this.promoCodes.get(promoCode)

      if (!promo) {
        throw new Error("Invalid promo code")
      }

      // Calculate discount
      const discount = this.calculateDiscount(promo, originalAmount)

      // Update usage counters
      promo.currentUses += 1
      promo.updatedAt = new Date()
      this.promoCodes.set(promoCode, promo)

      // Update user usage
      this.incrementUserPromoUsage(userId, promoCode)

      // Log promo usage
      logger.info("Promo code applied", {
        code: promoCode,
        userId,
        rideId,
        originalAmount,
        discount,
        finalAmount: originalAmount - discount,
      })

      return {
        success: true,
        discount,
        finalAmount: Math.max(0, originalAmount - discount),
        promoDetails: {
          code: promo.code,
          type: promo.type,
          description: promo.description,
        },
      }
    } catch (error) {
      logger.error("Failed to apply promo code", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Calculate discount amount
  calculateDiscount(promo, amount) {
    switch (promo.type) {
      case "percentage":
        return Math.min((amount * promo.value) / 100, promo.maxDiscount || amount)
      case "fixed":
        return Math.min(promo.value, amount)
      case "free_ride":
        return amount
      default:
        return 0
    }
  }

  // Get user promo usage
  getUserPromoUsage(userId, promoCode) {
    const userUsage = this.userPromoUsage.get(userId) || {}
    return userUsage[promoCode] || 0
  }

  // Increment user promo usage
  incrementUserPromoUsage(userId, promoCode) {
    const userUsage = this.userPromoUsage.get(userId) || {}
    userUsage[promoCode] = (userUsage[promoCode] || 0) + 1
    this.userPromoUsage.set(userId, userUsage)
  }

  // Get available promo codes for user
  async getAvailablePromoCodes(userId, rideData) {
    try {
      const availablePromos = []
      const now = new Date()

      for (const [code, promo] of this.promoCodes) {
        // Check basic eligibility
        if (
          promo.isActive &&
          now >= promo.validFrom &&
          now <= promo.validUntil &&
          (!promo.maxUses || promo.currentUses < promo.maxUses) &&
          this.getUserPromoUsage(userId, code) < promo.maxUsesPerUser &&
          rideData.estimatedFare >= promo.minOrderAmount &&
          promo.applicableRideTypes.includes(rideData.rideType) &&
          (promo.applicableCities.length === 0 || promo.applicableCities.includes(rideData.city))
        ) {
          const discount = this.calculateDiscount(promo, rideData.estimatedFare)
          availablePromos.push({
            code: promo.code,
            description: promo.description,
            type: promo.type,
            value: promo.value,
            discount,
            finalAmount: Math.max(0, rideData.estimatedFare - discount),
            validUntil: promo.validUntil,
          })
        }
      }

      return {
        success: true,
        promoCodes: availablePromos,
      }
    } catch (error) {
      logger.error("Failed to get available promo codes", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Get promo code details
  async getPromoCode(code) {
    try {
      const promo = this.promoCodes.get(code.toUpperCase())

      if (!promo) {
        return {
          success: false,
          error: "Promo code not found",
        }
      }

      return {
        success: true,
        promoCode: promo,
      }
    } catch (error) {
      logger.error("Failed to get promo code", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Update promo code
  async updatePromoCode(code, updates) {
    try {
      const promo = this.promoCodes.get(code.toUpperCase())

      if (!promo) {
        throw new Error("Promo code not found")
      }

      // Update promo code
      Object.assign(promo, updates, { updatedAt: new Date() })
      this.promoCodes.set(code.toUpperCase(), promo)

      logger.info("Promo code updated", { code: promo.code, updates })

      return {
        success: true,
        promoCode: promo,
      }
    } catch (error) {
      logger.error("Failed to update promo code", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Delete promo code
  async deletePromoCode(code) {
    try {
      const promoCode = code.toUpperCase()
      const promo = this.promoCodes.get(promoCode)

      if (!promo) {
        throw new Error("Promo code not found")
      }

      this.promoCodes.delete(promoCode)

      logger.info("Promo code deleted", { code: promoCode })

      return {
        success: true,
        message: "Promo code deleted successfully",
      }
    } catch (error) {
      logger.error("Failed to delete promo code", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Get all promo codes (admin)
  async getAllPromoCodes() {
    try {
      const promoCodes = Array.from(this.promoCodes.values())

      return {
        success: true,
        promoCodes,
      }
    } catch (error) {
      logger.error("Failed to get all promo codes", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Initialize with sample promo codes
  initializeSamplePromoCodes() {
    const samplePromos = [
      {
        code: "WELCOME10",
        type: "percentage",
        value: 10,
        description: "10% off your first ride",
        maxUses: 1000,
        maxUsesPerUser: 1,
        minOrderAmount: 5,
        validFrom: new Date("2024-01-01"),
        validUntil: new Date("2024-12-31"),
        applicableRideTypes: ["standard", "premium"],
        applicableCities: [],
        isActive: true,
      },
      {
        code: "SAVE5",
        type: "fixed",
        value: 5,
        description: "$5 off any ride",
        maxUses: 500,
        maxUsesPerUser: 3,
        minOrderAmount: 15,
        validFrom: new Date("2024-01-01"),
        validUntil: new Date("2024-06-30"),
        applicableRideTypes: ["standard", "premium", "shared"],
        applicableCities: [],
        isActive: true,
      },
      {
        code: "FREERIDE",
        type: "free_ride",
        value: 25,
        description: "Free ride up to $25",
        maxUses: 100,
        maxUsesPerUser: 1,
        minOrderAmount: 0,
        validFrom: new Date("2024-01-01"),
        validUntil: new Date("2024-03-31"),
        applicableRideTypes: ["standard"],
        applicableCities: [],
        isActive: true,
      },
    ]

    samplePromos.forEach((promo) => {
      promo.currentUses = 0
      promo.createdAt = new Date()
      promo.updatedAt = new Date()
      this.promoCodes.set(promo.code, promo)
    })

    logger.info("Sample promo codes initialized", { count: samplePromos.length })
  }
}

module.exports = new PromoService()
