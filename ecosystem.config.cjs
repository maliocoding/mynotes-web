module.exports = {
  apps: [{
    name: 'notes',
    script: 'start-with-env.js',
    cwd: 'C:/nextjs/notes',
    env: {
      NODE_ENV: 'production',
      PORT: 3007
    }
  }]
};
