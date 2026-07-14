// Redis configuration for caching and session management
// Handles Redis connection and provides caching utilities

const redis = require("redis")

let redisClient = null

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      retry_strategy: (options) => {
        if (options.error && options.error.code === "ECONNREFUSED") {
          console.error("Redis server connection refused")
          return new Error("Redis server connection refused")
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          console.error("Redis retry time exhausted")
          return new Error("Retry time exhausted")
        }
        if (options.attempt > 10) {
          console.error("Redis connection attempts exhausted")
          return undefined
        }
        return Math.min(options.attempt * 100, 3000)
      },
    })

    redisClient.on("connect", () => {
      console.log("Redis connected successfully")
    })

    redisClient.on("error", (err) => {
      console.error("Redis connection error:", err)
    })

    redisClient.on("ready", () => {
      console.log("Redis client ready")
    })

    redisClient.on("end", () => {
      console.log("Redis connection ended")
    })

    await redisClient.connect()
    return redisClient
  } catch (error) {
    console.error("Redis connection failed:", error)
    return null
  }
}

// Cache utilities
const cache = {
  // Set cache with expiration
  set: async (key, value, expireInSeconds = 3600) => {
    try {
      if (!redisClient) return false
      await redisClient.setEx(key, expireInSeconds, JSON.stringify(value))
      return true
    } catch (error) {
      console.error("Cache set error:", error)
      return false
    }
  },

  // Get cache
  get: async (key) => {
    try {
      if (!redisClient) return null
      const value = await redisClient.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error("Cache get error:", error)
      return null
    }
  },

  // Delete cache
  del: async (key) => {
    try {
      if (!redisClient) return false
      await redisClient.del(key)
      return true
    } catch (error) {
      console.error("Cache delete error:", error)
      return false
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      if (!redisClient) return false
      const result = await redisClient.exists(key)
      return result === 1
    } catch (error) {
      console.error("Cache exists error:", error)
      return false
    }
  },

  // Set with pattern for bulk operations
  setPattern: async (pattern, data, expireInSeconds = 3600) => {
    try {
      if (!redisClient) return false
      const pipeline = redisClient.multi()

      Object.keys(data).forEach((key) => {
        const fullKey = `${pattern}:${key}`
        pipeline.setEx(fullKey, expireInSeconds, JSON.stringify(data[key]))
      })

      await pipeline.exec()
      return true
    } catch (error) {
      console.error("Cache setPattern error:", error)
      return false
    }
  },

  // Get keys by pattern
  getPattern: async (pattern) => {
    try {
      if (!redisClient) return {}
      const keys = await redisClient.keys(`${pattern}:*`)
      const pipeline = redisClient.multi()

      keys.forEach((key) => pipeline.get(key))
      const results = await pipeline.exec()

      const data = {}
      keys.forEach((key, index) => {
        const shortKey = key.replace(`${pattern}:`, "")
        data[shortKey] = results[index] ? JSON.parse(results[index]) : null
      })

      return data
    } catch (error) {
      console.error("Cache getPattern error:", error)
      return {}
    }
  },
}

// Session management
const session = {
  // Store user session
  setUserSession: async (userId, sessionData, expireInSeconds = 86400) => {
    return await cache.set(`session:user:${userId}`, sessionData, expireInSeconds)
  },

  // Get user session
  getUserSession: async (userId) => {
    return await cache.get(`session:user:${userId}`)
  },

  // Delete user session
  deleteUserSession: async (userId) => {
    return await cache.del(`session:user:${userId}`)
  },

  // Store driver location
  setDriverLocation: async (driverId, locationData, expireInSeconds = 300) => {
    return await cache.set(`location:driver:${driverId}`, locationData, expireInSeconds)
  },

  // Get driver location
  getDriverLocation: async (driverId) => {
    return await cache.get(`location:driver:${driverId}`)
  },
}

// Rate limiting
const rateLimit = {
  // Check and increment rate limit
  checkLimit: async (key, limit = 100, windowInSeconds = 3600) => {
    try {
      if (!redisClient) return { allowed: true, remaining: limit }

      const current = await redisClient.get(key)
      if (!current) {
        await redisClient.setEx(key, windowInSeconds, 1)
        return { allowed: true, remaining: limit - 1 }
      }

      const count = Number.parseInt(current)
      if (count >= limit) {
        return { allowed: false, remaining: 0 }
      }

      await redisClient.incr(key)
      return { allowed: true, remaining: limit - count - 1 }
    } catch (error) {
      console.error("Rate limit check error:", error)
      return { allowed: true, remaining: limit }
    }
  },
}

// Close Redis connection
const closeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit()
      console.log("Redis connection closed")
    }
  } catch (error) {
    console.error("Error closing Redis connection:", error)
  }
}

module.exports = {
  connectRedis,
  closeRedis,
  cache,
  session,
  rateLimit,
  redisClient: () => redisClient,
}
