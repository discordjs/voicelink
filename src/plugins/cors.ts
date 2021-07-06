import fp from 'fastify-plugin';
import cors, { FastifyCorsOptions } from 'fastify-cors';

/**
 * This plugins adds cors
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp<FastifyCorsOptions>(async (fastify) => {
	await fastify.register(cors, { origin: '*' });
});
