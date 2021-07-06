import { join } from 'path';
import AutoLoad, { AutoloadPluginOptions } from 'fastify-autoload';
import type { FastifyPluginAsync } from 'fastify';
import type { Snowflake } from 'discord-api-types/v8';

import type { Client } from './core/Client';

declare module 'fastify' {
	export interface FastifyInstance {
		clients: Map<Snowflake, Client>;
	}
}

export type AppOptions = {
	// Place your custom options for app below here.
	logger: true;
} & Partial<AutoloadPluginOptions>;

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
	// Place here your custom code!
	fastify.decorate('clients', new Map<Snowflake, Client>());

	// Do not touch the following lines
	await fastify.register(AutoLoad, {
		dir: join(__dirname, 'plugins'),
		options: opts,
	});

	await fastify.register(AutoLoad, {
		dir: join(__dirname, 'routes'),
		options: opts,
	});
};

export default app;
export { app };
