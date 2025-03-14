# JTS Minecraft Server

A modern, scalable Node.js backend for managing multiple Minecraft servers with real-time monitoring, user authentication, and comprehensive API.

## Features

- **Multiple Server Management**: Run and manage multiple Minecraft servers simultaneously
- **Real-time Monitoring**: Track server performance, player counts, and resource usage
- **User Authentication**: Secure multi-user system with role-based permissions
- **REST API**: Comprehensive API for server management
- **WebSocket Support**: Real-time updates using Socket.IO
- **Backup System**: Automated backups with restore functionality
- **Docker Support**: Containerized deployment for easy scaling
- **Database Integration**: MongoDB for data persistence
- **Plugin/Mod Management**: Install and configure plugins and mods
- **Logging**: Comprehensive logging and error tracking

## System Requirements

- Node.js v14+ (v16+ recommended)
- MongoDB v4.4+
- Java JDK 17+ (for running Minecraft servers)
- Docker (optional, for containerized deployment)

## Quick Start

### Standard Installation

1. Clone the repository:
```bash
git clone https://github.com/CoreGamer32D/JTSMinecraftServer.git
cd minecraft-server-backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Start the server:
```bash
npm start
```

### Docker Installation

1. Build and run using Docker Compose:
```bash
docker-compose up -d
```

## Configuration

The application can be configured through environment variables in the `.env` file:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/minecraft-manager

# Security
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=24h

# Minecraft Configuration
MC_SERVERS_DIR=/path/to/servers
MC_BACKUPS_DIR=/path/to/backups
MC_MAX_LOG_LINES=1000
MC_STOP_TIMEOUT=30000

# Monitoring
MONITORING_ENABLED=true
MONITORING_INTERVAL=30000

# Allowed Origins for CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

## API Documentation

### Authentication

```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET /api/auth/me
```

### Server Management

```
GET /api/servers
POST /api/servers
GET /api/servers/:id
PUT /api/servers/:id
DELETE /api/servers/:id
POST /api/servers/:id/start
POST /api/servers/:id/stop
POST /api/servers/:id/restart
POST /api/servers/:id/command
GET /api/servers/:id/logs
GET /api/servers/:id/properties
PUT /api/servers/:id/properties
```

### Backup Management

```
GET /api/servers/:id/backups
POST /api/servers/:id/backups
GET /api/backups/:id
POST /api/backups/:id/restore
DELETE /api/backups/:id
```

### Player Management

```
GET /api/servers/:id/players
GET /api/players
GET /api/players/:uuid
```

### Monitoring

```
GET /api/servers/:id/stats
GET /api/servers/:id/performance
```

## WebSocket Events

The backend uses Socket.IO to provide real-time updates:

- `serverStatus`: Server status updates
- `serverLog`: Real-time server logs
- `playerJoin`: Player join notifications
- `playerLeave`: Player leave notifications
- `serverStats`: Server performance metrics
- `backupProgress`: Backup operation progress

## Project Structure

```
/src
  /config            # Configuration files
  /controllers       # API controllers
  /database          # Database connection and setup
  /middleware        # Express middleware
  /models            # Mongoose models
  /routes            # API routes
  /services          # Business logic
    /minecraft       # Minecraft server management
    /backup          # Backup management
    /monitor         # Monitoring system
  /utils             # Utility functions
  /socket            # WebSocket handlers
  index.js           # Application entry point
/docker              # Docker configuration
/scripts             # Utility scripts
```

## Security Considerations

- All API endpoints require authentication except for login/register
- JWT tokens are used for API authentication
- Role-based access control for server management
- Secure password hashing with bcrypt
- Rate limiting to prevent abuse
- Server processes run with limited privileges

## Development

### Running in Development Mode

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/my-new-feature`)
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Minecraft](https://www.minecraft.net/) for the awesome game
- [Node.js](https://nodejs.org/) ecosystem for making this project possible
- All contributors who have helped improve this project