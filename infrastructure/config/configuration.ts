/**
 * Aggregated infrastructure configuration loader, combining database,
 * redis, rabbitmq, and security namespaces for ConfigModule.forRoot().
 */
export default () => ({
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  },
});
