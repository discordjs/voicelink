import fp from 'fastify-plugin';
import swagger, { SwaggerOptions } from 'fastify-swagger';

/**
 * This plugins adds swagger documentation
 *
 * @see https://github.com/fastify/fastify-swagger
 */
export default fp<SwaggerOptions>(async (fastify) => {
	await fastify.register(swagger, {
		routePrefix: '/documentation',
		swagger: {
			info: {
				title: 'voicelink',
				description: '',
				version: '0.1.0',
			},
			externalDocs: {
				url: 'https://swagger.io',
				description: 'Find more info here',
			},
			host: 'localhost',
			schemes: ['http'],
			consumes: ['application/json'],
			produces: ['application/json'],
		},
		exposeRoute: true,
	});
});
