// PM2 配置文件（不用 Docker 时使用）
// 用法：pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'hdhive-bot',
      script: 'npm',
      args: 'run start',
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
