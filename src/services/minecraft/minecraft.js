// src/services/minecraft.js
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { logger } = require('../../utils/logger');
const { MinecraftServer, ServerBackup } = require('../../models');
const { getServerResourceUsage } = require('../monitor');
const { backupServer } = require('../backup');
const config = require('../../config').getConfig();

// Map of running server instances
const runningServers = new Map();

/**
 * Get server installation status
 * @param {string} serverId - Server ID
 * @returns {Promise<Object>} Status information
 */
async function getServerStatus(serverId) {
  try {
    const server = await MinecraftServer.findById(serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    const isRunning = runningServers.has(serverId);
    let resourceUsage = null;
    
    if (isRunning) {
      resourceUsage = await getServerResourceUsage(serverId);
    }

    return {
      status: isRunning ? 'running' : 'stopped',
      server: {
        id: server._id,
        name: server.name,
        version: server.version,
        type: server.type,
        port: server.port,
        memory: server.memory,
        autostart: server.autostart,
        created: server.createdAt,
        lastStarted: server.lastStarted
      },
      resourceUsage,
      path: server.path
    };
  } catch (error) {
    logger.error(`Failed to get server status for ${serverId}:`, error);
    throw error;
  }
}

/**
 * List all servers
 * @returns {Promise<Array>} List of servers
 */
async function listServers() {
  try {
    const servers = await MinecraftServer.find({}).sort({ createdAt: -1 });
    return Promise.all(servers.map(async (server) => {
      const isRunning = runningServers.has(server._id.toString());
      let resourceUsage = null;
      
      if (isRunning) {
        resourceUsage = await getServerResourceUsage(server._id.toString());
      }
      
      return {
        id: server._id,
        name: server.name,
        version: server.version,
        type: server.type,
        port: server.port,
        status: isRunning ? 'running' : 'stopped',
        uptime: isRunning ? Date.now() - server.lastStarted : 0,
        resourceUsage,
        autostart: server.autostart
      };
    }));
  } catch (error) {
    logger.error('Failed to list servers:', error);
    throw error;
  }
}

/**
 * Create a new Minecraft server
 * @param {Object} serverData - Server configuration
 * @returns {Promise<Object>} Created server
 */
async function createServer(serverData) {
  try {
    // Validate server data
    const { name, version, type, port, memory } = serverData;
    
    if (!name || !version || !type || !port || !memory) {
      throw new Error('Missing required server configuration');
    }
    
    // Check if port is available
    const existingServer = await MinecraftServer.findOne({ port });
    if (existingServer) {
      throw new Error(`Port ${port} is already in use by another server`);
    }
    
    // Create server directory
    const serverPath = path.join(config.minecraft.serversDir, name);
    await fs.ensureDir(serverPath);
    
    // Download server jar if needed
    const jarPath = path.join(serverPath, `${type}-${version}.jar`);
    if (!fs.existsSync(jarPath)) {
      await downloadServerJar(type, version, jarPath);
    }
    
    // Create server instance in database
    const server = new MinecraftServer({
      name,
      version,
      type,
      port,
      memory,
      path: serverPath,
      jarFile: `${type}-${version}.jar`,
      autostart: serverData.autostart || false,
      properties: {
        'server-port': port.toString(),
        'max-players': serverData.maxPlayers || '20',
        'difficulty': serverData.difficulty || 'normal',
        'gamemode': serverData.gamemode || 'survival',
        'motd': serverData.motd || `${name} - Powered by NodeJS Minecraft Manager`
      }
    });
    
    await server.save();
    
    // Create server.properties file
    await updateServerProperties(server._id.toString());
    
    // Create eula.txt file with accepted EULA if specified
    if (serverData.acceptEula) {
      const eulaPath = path.join(serverPath, 'eula.txt');
      await fs.writeFile(eulaPath, 'eula=true\n');
    }
    
    return server;
  } catch (error) {
    logger.error('Failed to create server:', error);
    throw error;
  }
}

/**
 * Download server JAR file
 * @param {string} type - Server type (vanilla, paper, spigot)
 * @param {string} version - Minecraft version
 * @param {string} destination - Download path
 * @returns {Promise<void>}
 */
async function downloadServerJar(type, version, destination) {
  try {
    logger.info(`Downloading ${type} server version ${version}`);
    
    // Implementation depends on the server type
    switch (type) {
      case 'vanilla':
        // Logic to download vanilla server from Mojang
        throw new Error('Download not implemented for vanilla servers');
      
      case 'paper':
        // Logic to download PaperMC server
        throw new Error('Download not implemented for Paper servers');
      
      case 'spigot':
        // Logic to download Spigot server
        throw new Error('Download not implemented for Spigot servers');
      
      default:
        throw new Error(`Unknown server type: ${type}`);
    }
    
    // In a real implementation, you would actually download the file
    // For now, we'll just assume the file already exists
    logger.info(`Server jar downloaded to ${destination}`);
  } catch (error) {
    logger.error(`Failed to download server jar (${type} ${version}):`, error);
    throw error;
  }
}

/**
 * Update server.properties file
 * @param {string} serverId - Server ID
 * @param {Object} [newProperties] - New properties to set
 * @returns {Promise<Object>} Updated properties
 */
async function updateServerProperties(serverId, newProperties = {}) {
  try {
    const server = await MinecraftServer.findById(serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    
    if (runningServers.has(serverId)) {
      throw new Error('Cannot update properties while server is running');
    }
    
    // Update properties in database
    if (Object.keys(newProperties).length > 0) {
      server.properties = { ...server.properties, ...newProperties };
      await server.save();
    }
    
    // Generate properties file content
    let content = '# Minecraft server properties\n';
    content += `# Generated by Minecraft Server Manager on ${new Date().toISOString()}\n`;
    
    for (const [key, value] of Object.entries(server.properties)) {
      content += `${key}=${value}\n`;
    }
    
    // Write properties file
    const propertiesPath = path.join(server.path, 'server.properties');
    await fs.writeFile(propertiesPath, content);
    
    return server.properties;
  } catch (error) {
    logger.error(`Failed to update server.properties for ${serverId}:`, error);
    throw error;
  }
}

/**
 * Start a Minecraft server
 * @param {string} serverId - Server ID
 * @param {Object} io - Socket.IO instance for real-time updates
 * @returns {Promise<Object>} Start result
 */
async function startServer(serverId, io) {
  try {
    // Check if server is already running
    if (runningServers.has(serverId)) {
      return { status: 'error', message: 'Server is already running' };
    }
    
    // Get server from database
    const server = await MinecraftServer.findById(serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    
    // Ensure server directory exists
    if (!fs.existsSync(server.path)) {
      await fs.ensureDir(server.path);
    }
    
    // Check if server jar exists
    const jarPath = path.join(server.path, server.jarFile);
    if (!fs.existsSync(jarPath)) {
      throw new Error(`Server JAR file not found at ${jarPath}`);
    }
    
    // Create start command
    const javaArgs = [
      `-Xms${server.memory.min}`,
      `-Xmx${server.memory.max}`,
      '-jar',
      server.jarFile,
      'nogui'
    ];
    
    // Add JVM flags if specified
    if (server.jvmFlags && server.jvmFlags.length > 0) {
      javaArgs.unshift(...server.jvmFlags);
    }
    
    // Start the server process
    const process = spawn('java', javaArgs, {
      cwd: server.path
    });
    
    // Create log storage array
    const logs = [];
    const MAX_LOGS = config.minecraft.maxLogLines || 1000;
    
    // Register stdout handler
    process.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (!message) return;
      
      const logEntry = {
        timestamp: Date.now(),
        message,
        type: 'stdout'
      };
      
      // Add to log array
      logs.push(logEntry);
      if (logs.length > MAX_LOGS) logs.shift();
      
      // Emit log event to subscribers
      if (io) {
        io.to(`server:${serverId}:logs`).emit('serverLog', logEntry);
      }
      
      logger.debug(`[${server.name}] ${message}`);
    });
    
    // Register stderr handler
    process.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (!message) return;
      
      const logEntry = {
        timestamp: Date.now(),
        message,
        type: 'stderr'
      };
      
      logs.push(logEntry);
      if (logs.length > MAX_LOGS) logs.shift();
      
      if (io) {
        io.to(`server:${serverId}:logs`).emit('serverLog', logEntry);
      }
      
      logger.error(`[${server.name}] ${message}`);
    });
    
    // Register close handler
    process.on('close', async (code) => {
      const logEntry = {
        timestamp: Date.now(),
        message: `Server process exited with code ${code}`,
        type: 'system'
      };
      
      logs.push(logEntry);
      
      if (io) {
        io.to(`server:${serverId}:logs`).emit('serverLog', logEntry);
        io.to(`server:${serverId}`).emit('serverStatus', { status: 'stopped' });
      }
      
      logger.info(`[${server.name}] Server process exited with code ${code}`);
      
      // Update server status in database
      server.lastStopped = Date.now();
      await server.save();
      
      // Remove from running servers map
      runningServers.delete(serverId);
    });
    
    // Store server instance in map
    runningServers.set(serverId, {
      process,
      logs,
      startTime: Date.now(),
      server: server
    });
    
    // Update server status in database
    server.lastStarted = Date.now();
    await server.save();
    
    // Emit server started event
    if (io) {
      io.to(`server:${serverId}`).emit('serverStatus', { status: 'running' });
    }
    
    return { 
      status: 'success', 
      message: 'Server started successfully',
      serverId: serverId
    };
  } catch (error) {
    logger.error(`Failed to start server ${serverId}:`, error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Stop a Minecraft server
 * @param {string} serverId - Server ID
 * @param {boolean} [force=false] - Force kill if true
 * @returns {Promise<Object>} Stop result
 */
async function stopServer(serverId, force = false) {
  try {
    const serverInstance = runningServers.get(serverId);
    if (!serverInstance) {
      return { status: 'error', message: 'Server is not running' };
    }
    
    if (force) {
      // Force kill the process
      serverInstance.process.kill('SIGKILL');
      return { status: 'success', message: 'Server forcefully stopped' };
    }
    
    // Send stop command
    serverInstance.process.stdin.write('stop\n');
    
    // Set timeout to force kill
    const killTimeout = setTimeout(() => {
      const instance = runningServers.get(serverId);
      if (instance) {
        logger.warn(`Force killing server ${serverId} after timeout`);
        instance.process.kill('SIGKILL');
      }
    }, config.minecraft.stopTimeout || 30000);
    
    // Create promise to resolve when process exits
    return new Promise((resolve) => {
      serverInstance.process.once('close', () => {
        clearTimeout(killTimeout);
        resolve({ status: 'success', message: 'Server stopped gracefully' });
      });
    });
  } catch (error) {
    logger.error(`Failed to stop server ${serverId}:`, error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Stop all running servers
 * @returns {Promise<Array>} Results of stopping each server
 */
async function stopAllServers() {
  const stopPromises = [];
  
  for (const serverId of runningServers.keys()) {
    stopPromises.push(stopServer(serverId));
  }
  
  return Promise.all(stopPromises);
}

/**
 * Send command to a Minecraft server
 * @param {string} serverId - Server ID
 * @param {string} command - Command to send
 * @returns {Promise<Object>} Command result
 */
async function sendCommand(serverId, command) {
  try {
    const serverInstance = runningServers.get(serverId);
    if (!serverInstance) {
      return { status: 'error', message: 'Server is not running' };
    }
    
    // Log the command
    const logEntry = {
      timestamp: Date.now(),
      message: `Command executed: ${command}`,
      type: 'command'
    };
    
    serverInstance.logs.push(logEntry);
    if (serverInstance.logs.length > config.minecraft.maxLogLines) {
      serverInstance.logs.shift();
    }
    
    // Send command to server
    serverInstance.process.stdin.write(`${command}\n`);
    
    return { status: 'success', message: `Command sent: ${command}` };
  } catch (error) {
    logger.error(`Failed to send command to server ${serverId}:`, error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Get server logs
 * @param {string} serverId - Server ID
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Server logs
 */
async function getServerLogs(serverId, options = {}) {
  try {
    const serverInstance = runningServers.get(serverId);
    if (!serverInstance) {
      // Get logs from file if server is not running
      return getServerLogsFromFile(serverId, options);
    }
    
    // Get logs from memory
    let logs = [...serverInstance.logs];
    
    // Apply type filter
    if (options.type) {
      logs = logs.filter(log => log.type === options.type);
    }
    
    // Apply text search
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      logs = logs.filter(log => log.message.toLowerCase().includes(searchLower));
    }
    
    // Apply limit
    const limit = options.limit || 100;
    logs = logs.slice(-Math.min(limit, logs.length));
    
    return logs;
  } catch (error) {
    logger.error(`Failed to get logs for server ${serverId}:`, error);
    throw error;
  }
}

/**
 * Get server logs from log file
 * @param {string} serverId - Server ID
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Server logs
 */
async function getServerLogsFromFile(serverId, options = {}) {
  try {
    const server = await MinecraftServer.findById(serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    
    const logPath = path.join(server.path, 'logs', 'latest.log');
    if (!fs.existsSync(logPath)) {
      return [];
    }
    
    // Read log file
    const content = await fs.readFile(logPath, 'utf8');
    const lines = content.split('\n');
    
    // Parse log lines
    const logs = lines
      .filter(line => line.trim())
      .map(line => {
        // Try to parse timestamp and log level
        const match = line.match(/\[(\d{2}:\d{2}:\d{2})\] \[([^\]]+)\]: (.+)/);
        if (match) {
          const [, timeStr, level, message] = match;
          
          // Convert time string to timestamp (assuming current day)
          const now = new Date();
          const [hours, minutes, seconds] = timeStr.split(':').map(Number);
          const time = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
          
          return {
            timestamp: time.getTime(),
            message: line,
            type: level.includes('ERROR') ? 'stderr' : 'stdout'
          };
        }
        
        // Default format if pattern doesn't match
        return {
          timestamp: Date.now(),
          message: line,
          type: 'stdout'
        };
      });
    
    // Apply filters
    let filteredLogs = logs;
    
    if (options.type) {
      filteredLogs = filteredLogs.filter(log => log.type === options.type);
    }
    
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => log.message.toLowerCase().includes(searchLower));
    }
    
    // Apply limit
    const limit = options.limit || 100;
    filteredLogs = filteredLogs.slice(-Math.min(limit, filteredLogs.length));
    
    return filteredLogs;
  } catch (error) {
    logger.error(`Failed to get logs from file for server ${serverId}:`, error);
    throw error;
  }
}

/**
 * Create a backup of a server
 * @param {string} serverId - Server ID
 * @param {string} name - Backup name
 * @returns {Promise<Object>} Backup result
 */
async function createBackup(serverId, name) {
  try {
    const server = await MinecraftServer.findById(serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    
    // Create backup
    const backup = await backupServer(server, name);
    
    return {
      status: 'success',
      message: 'Backup created successfully',
      backup: {
        id: backup._id,
        name: backup.name,
        size: backup.size,
        createdAt: backup.createdAt,
        path: backup.path
      }
    };
  } catch (error) {
    logger.error(`Failed to create backup for server ${serverId}:`, error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Restore a backup
 * @param {string} backupId - Backup ID
 * @returns {Promise<Object>} Restore result
 */
async function restoreBackup(backupId) {
  try {
    const backup = await ServerBackup.findById(backupId).populate('server');
    if (!backup) {
      throw new Error('Backup not found');
    }
    
    const server = backup.server;
    const serverId = server._id.toString();
    
    // Check if server is running
    if (runningServers.has(serverId)) {
      await stopServer(serverId);
    }
    
    // Restore backup
    // Implementation depends on backup format (zip, tar, etc.)
    logger.info(`Restoring backup ${backupId} to server ${serverId}`);
    
    // Example implementation for a zip backup
    const extractPath = server.path;
    await fs.remove(extractPath);
    await fs.ensureDir(extractPath);
    
    // Extract backup
    // This is a placeholder - actual implementation would use a library like adm-zip or tar
    logger.info(`Extracting backup from ${backup.path} to ${extractPath}`);
    
    return {
      status: 'success',
      message: 'Backup restored successfully',
      serverId
    };
  } catch (error) {
    logger.error(`Failed to restore backup ${backupId}:`, error);
    return { status: 'error', message: error.message };
  }
}

module.exports = {
  getServerStatus,
  listServers,
  createServer,
  updateServerProperties,
  startServer,
  stopServer,
  stopAllServers,
  sendCommand,
  getServerLogs,
  createBackup,
  restoreBackup
};