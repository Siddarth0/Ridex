// Logging utility with different log levels and file rotation
// Uses Winston for structured logging

const winston = require("winston")
const path = require("path")

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
}

winston.addColors(colors)

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
)

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format,
  }),

  // File transport for errors
  new winston.transports.File({
    filename: path.join(__dirname, "../logs/error.log"),
    level: "error",
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, "../logs/combined.log"),
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  }),
]

// Create logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  levels,
  format,
  transports,
})

// Create logs directory if it doesn't exist
const fs = require("fs")
const logsDir = path.join(__dirname, "../logs")
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// HTTP request logger middleware
const httpLogger = (req, res, next) => {
  const start = Date.now()

  res.on("finish", () => {
    const duration = Date.now() - start
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`

    if (res.statusCode >= 400) {
      logger.error(message)
    } else {
      logger.http(message)
    }
  })

  next()
}

// Log ride events
const logRideEvent = (event, rideId, userId, driverId, details = {}) => {
  logger.info(`Ride Event: ${event}`, {
    event,
    rideId,
    userId,
    driverId,
    ...details,
    timestamp: new Date().toISOString(),
  })
}

// Log authentication events
const logAuthEvent = (event, userId, ip, userAgent, success = true) => {
  const level = success ? "info" : "warn"
  logger[level](`Auth Event: ${event}`, {
    event,
    userId,
    ip,
    userAgent,
    success,
    timestamp: new Date().toISOString(),
  })
}

// Log payment events
const logPaymentEvent = (event, userId, amount, paymentMethod, success = true) => {
  const level = success ? "info" : "error"
  logger[level](`Payment Event: ${event}`, {
    event,
    userId,
    amount,
    paymentMethod,
    success,
    timestamp: new Date().toISOString(),
  })
}

// Log system events
const logSystemEvent = (event, details = {}) => {
  logger.info(`System Event: ${event}`, {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  })
}

module.exports = {
  logger,
  httpLogger,
  logRideEvent,
  logAuthEvent,
  logPaymentEvent,
  logSystemEvent,
}
