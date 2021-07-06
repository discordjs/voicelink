import fp from 'fastify-plugin';
import helmet from 'fastify-helmet';

/**
 * This plugins adds important security headers
 *
 * @see https://github.com/fastify/fastify-helmet
 */
export default fp<any>(async (fastify) => {
	await fastify.register(helmet, { contentSecurityPolicy: false });
});
