module.exports = {
  apps: [
    {
      name: "book-personae",
      cwd: "/var/www/book-personae",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010 -H 127.0.0.1",
      env: {
        NODE_ENV: "production",
        PORT: "3010",
        HOSTNAME: "127.0.0.1",
      },
      max_memory_restart: "700M",
      max_restarts: 20,
      min_uptime: "10s",
      time: true,
    },
  ],
};
