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
const { configureEnvironment } = require('./utils/config');

const config = configureEnvironment();

const logger = initializeLogger(config.logging);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.cors.origins,
    methods: ['GET', 'POST']
  }
});

app.use(helmet());
app.use(express.json({ limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (config.cors.origins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

connectDatabase(config.database)
  .then(() => logger.info('Database connected successfully'))
  .catch(err => {
    logger.error('Database connection failed', err);
    process.exit(1);
  });

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

app.set('io', io);

app.use('/api', routes);

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

server.listen(config.port, () => {
  logger.info(`Server started on port ${config.port} in ${config.env} mode`);
  
  if (config.monitoring.enabled) {
    setupServerMonitoring(io);
  }
});

const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  const { stopAllServers } = require('./services/minecraft');
  await stopAllServers();
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = { app, server };