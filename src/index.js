// src/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const { initializeLogger } = require('./utils/logger');
const { connectDatabase } = require('./database');
const { setupServerMonitoring } = require('./services/monitor');
const { configureEnvironment } = require('./config');

// Initialize configuration
const config = configureEnvironment();

// Initialize logger
const logger = initializeLogger(config.logging);

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.cors.origins,
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (config.cors.origins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Database connection
connectDatabase(config.database)
  .then(() => logger.info('Database connected successfully'))
  .catch(err => {
    logger.error('Database connection failed', err);
    process.exit(1);
  });

// Initialize Socket.IO for real-time communication
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('subscribe', (channel) => {
    logger.info(`Client ${socket.id} subscribed to ${channel}`);
    socket.join(channel);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Share socket.io instance with routes
app.set('io', io);

// Register routes
app.use('/api', routes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Uncaught error', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(config.env !== 'production' && { stack: err.stack })
  });
});

// Start server
server.listen(config.port, () => {
  logger.info(`Server started on port ${config.port} in ${config.env} mode`);
  
  // Set up server monitoring if enabled
  if (config.monitoring.enabled) {
    setupServerMonitoring(io);
  }
});

// Handle graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  // Implement cleanup code here, like stopping all running MC servers
  const { stopAllServers } = require('./services/minecraft');
  await stopAllServers();
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = { app, server };