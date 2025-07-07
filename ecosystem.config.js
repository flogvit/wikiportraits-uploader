module.exports = {
  apps: [{
    name: 'wikiportraits-uploader',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/wikiportraits-uploader',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3022
    },
    error_file: '/var/log/wikiportraits-uploader/error.log',
    out_file: '/var/log/wikiportraits-uploader/out.log',
    log_file: '/var/log/wikiportraits-uploader/combined.log',
    time: true
  }]
}