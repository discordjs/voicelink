import fp from 'fastify-plugin';
import websocket, { WebsocketPluginOptions } from 'fastify-websocket';

/**
 * This plugins adds add WebSocket support
 *
 * @see https://github.com/fastify/fastify-websocket
 */
export default fp<WebsocketPluginOptions>(async (fastify) => {
	await fastify.register(websocket);
});
