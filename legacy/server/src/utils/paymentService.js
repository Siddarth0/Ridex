const Stripe = require("stripe")
const logger = require("./logger")

class PaymentService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy_stripe_key_12345")
  }

  // Create payment intent for ride
  async createPaymentIntent(amount, currency = "usd", metadata = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      })

      logger.info("Payment intent created", {
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      })

      return {
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          status: paymentIntent.status,
        },
      }
    } catch (error) {
      logger.error("Payment intent creation failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Confirm payment
  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId)

      return {
        success: true,
        status: paymentIntent.status,
        paymentIntent,
      }
    } catch (error) {
      logger.error("Payment confirmation failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Create connected account for driver
  async createDriverAccount(driverData) {
    try {
      const account = await this.stripe.accounts.create({
        type: "express",
        country: "US",
        email: driverData.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        individual: {
          first_name: driverData.firstName,
          last_name: driverData.lastName,
          email: driverData.email,
          phone: driverData.phone,
        },
      })

      return {
        success: true,
        accountId: account.id,
      }
    } catch (error) {
      logger.error("Driver account creation failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Create account link for driver onboarding
  async createAccountLink(accountId, refreshUrl, returnUrl) {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      })

      return {
        success: true,
        url: accountLink.url,
      }
    } catch (error) {
      logger.error("Account link creation failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Transfer payment to driver
  async transferToDriver(amount, driverAccountId, rideId) {
    try {
      const platformFee = Math.round(amount * 0.15 * 100) // 15% platform fee
      const driverAmount = Math.round(amount * 100) - platformFee

      const transfer = await this.stripe.transfers.create({
        amount: driverAmount,
        currency: "usd",
        destination: driverAccountId,
        metadata: {
          rideId,
          type: "ride_payment",
        },
      })

      logger.info("Payment transferred to driver", {
        transferId: transfer.id,
        driverAmount: driverAmount / 100,
        platformFee: platformFee / 100,
        rideId,
      })

      return {
        success: true,
        transfer: {
          id: transfer.id,
          amount: driverAmount / 100,
          platformFee: platformFee / 100,
        },
      }
    } catch (error) {
      logger.error("Driver payment transfer failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Process refund
  async processRefund(paymentIntentId, amount = null, reason = "requested_by_customer") {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason,
      }

      if (amount) {
        refundData.amount = Math.round(amount * 100)
      }

      const refund = await this.stripe.refunds.create(refundData)

      logger.info("Refund processed", {
        refundId: refund.id,
        amount: refund.amount / 100,
        paymentIntentId,
      })

      return {
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
        },
      }
    } catch (error) {
      logger.error("Refund processing failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Get payment methods for customer
  async getPaymentMethods(customerId) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      })

      return {
        success: true,
        paymentMethods: paymentMethods.data.map((pm) => ({
          id: pm.id,
          type: pm.type,
          card: pm.card
            ? {
                brand: pm.card.brand,
                last4: pm.card.last4,
                expMonth: pm.card.exp_month,
                expYear: pm.card.exp_year,
              }
            : null,
        })),
      }
    } catch (error) {
      logger.error("Failed to get payment methods", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Create customer
  async createCustomer(userData) {
    try {
      const customer = await this.stripe.customers.create({
        email: userData.email,
        name: `${userData.firstName} ${userData.lastName}`,
        phone: userData.phone,
        metadata: {
          userId: userData.userId,
        },
      })

      return {
        success: true,
        customerId: customer.id,
      }
    } catch (error) {
      logger.error("Customer creation failed", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Calculate platform fee
  calculatePlatformFee(amount) {
    return Math.round(amount * 0.15 * 100) / 100 // 15% platform fee
  }

  // Calculate driver earnings
  calculateDriverEarnings(amount) {
    const platformFee = this.calculatePlatformFee(amount)
    return amount - platformFee
  }
}

module.exports = new PaymentService()
