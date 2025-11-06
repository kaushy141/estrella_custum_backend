module.exports = {
  apps: [
    {
      name: 'estrella-backend',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      // Logging configuration to ensure all logs appear
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      // Ensure all output is captured
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};

