import fp from 'fastify-plugin';
import compression, { FastifyCompressOptions } from 'fastify-compress';

/**
 * This plugins adds compression utils
 *
 * @see https://github.com/fastify/fastify-compress
 */
export default fp<FastifyCompressOptions>(async (fastify) => {
	await fastify.register(compression);
});
