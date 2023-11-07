/* eslint-env node */

module.exports = {
  apps: [
    {
      name: 'interval',
      cwd: '/web',
      script: 'NODE_ENV=production yarn start:server',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      restart_delay: 1000,
      max_restarts: 5,
    },
    {
      name: 'wss',
      cwd: '/web',
      script: 'NODE_ENV=production yarn start:wss',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      restart_delay: 1000,
      max_restarts: 5,
    },
  ],
}
