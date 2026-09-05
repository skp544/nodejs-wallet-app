import path from "node:path";
import winston from "winston";

const isProduction = process.env.NODE_ENV === "production";
const logDir = process.env.LOG_DIR ?? "logs";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

winston.addColors({
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "gray",
});

const level = process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");

// Shared logger-level format: must run here (not only on a transport) for
// winston to correctly extract `message`/`stack` from Error objects passed
// directly to logger.error(err).
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
);

const consoleFormat = isProduction
  ? winston.format.json()
  : winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level: lvl, message, stack, ...meta }) => {
        const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
        return `${timestamp} [${lvl}]: ${stack ?? message}${rest}`;
      }),
    );

const transports: winston.transport[] = [new winston.transports.Console({ format: consoleFormat })];

if (isProduction) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: winston.format.json(),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      format: winston.format.json(),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  );
}

export const logger = winston.createLogger({
  levels,
  level,
  format: baseFormat,
  defaultMeta: { service: process.env.SERVICE_NAME ?? "wallet-app" },
  transports,
  exceptionHandlers: isProduction
    ? [new winston.transports.File({ filename: path.join(logDir, "exceptions.log"), format: winston.format.json() })]
    : undefined,
  rejectionHandlers: isProduction
    ? [new winston.transports.File({ filename: path.join(logDir, "rejections.log"), format: winston.format.json() })]
    : undefined,
  exitOnError: false,
});
