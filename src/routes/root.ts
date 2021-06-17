import type { FastifyPluginCallback } from 'fastify';

const root: FastifyPluginCallback = async (fastify): Promise<void> => {
	fastify.get('/', { schema: { hide: true } }, async () => {
		return { root: true };
	});
};

export default root;
