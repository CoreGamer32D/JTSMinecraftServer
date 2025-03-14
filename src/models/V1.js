const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define Minecraft Server Schema
const minecraftServerSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  version: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['vanilla', 'paper', 'spigot', 'forge', 'fabric'],
    default: 'vanilla'
  },
  port: {
    type: Number,
    required: true,
    unique: true
  },
  memory: {
    min: {
      type: String,
      default: '1G'
    },
    max: {
      type: String,
      default: '4G'
    }
  },
  path: {
    type: String,
    required: true
  },
  jarFile: {
    type: String,
    required: true
  },
  properties: {
    type: Map,
    of: String,
    default: {}
  },
  autostart: {
    type: Boolean,
    default: false
  },
  jvmFlags: [String],
  plugins: [{
    name: String,
    version: String,
    enabled: Boolean
  }],
  mods: [{
    name: String,
    version: String,
    enabled: Boolean
  }],
  lastStarted: Date,
  lastStopped: Date
}, {
  timestamps: true
});

// User schema for authentication
const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'moderator', 'user'],
    default: 'user'
  },
  permissions: {
    servers: {
      type: Map,
      of: {
        type: String,
        enum: ['owner', 'admin', 'moderator', 'viewer']
      },
      default: {}
    }
  },
  avatar: String,
  lastLogin: Date
}, {
  timestamps: true
});

// Server Backup Schema
const serverBackupSchema = new Schema({
  server: {
    type: Schema.Types.ObjectId,
    ref: 'MinecraftServer',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  scheduled: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Player Schema
const playerSchema = new Schema({
  uuid: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  lastSeen: {
    server: {
      type: Schema.Types.ObjectId,
      ref: 'MinecraftServer'
    },
    timestamp: Date
  },
  firstJoined: Date,
  playTime: {
    type: Number,
    default: 0
  },
  ip: String
}, {
  timestamps: true
});

// Action Log Schema
const actionLogSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true
  },
  target: {
    type: String,
    required: true
  },
  details: Schema.Types.Mixed,
  ip: String
}, {
  timestamps: true
});

// Define models
const MinecraftServer = mongoose.model('MinecraftServer', minecraftServerSchema);
const User = mongoose.model('User', userSchema);
const ServerBackup = mongoose.model('ServerBackup', serverBackupSchema);
const Player = mongoose.model('Player', playerSchema);
const ActionLog = mongoose.model('ActionLog', actionLogSchema);

module.exports = {
  MinecraftServer,
  User,
  ServerBackup,
  Player,
  ActionLog
};