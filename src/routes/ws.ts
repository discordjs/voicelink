import type { FastifyPluginCallback } from 'fastify';
import {
	GatewayDispatchEvents,
	GatewayVoiceServerUpdateDispatch,
	GatewayVoiceStateUpdateDispatch,
	Snowflake,
} from 'discord-api-types/v8';

import { WSCloseCodes, WSOpCodes } from '../constants';
import { Client } from '../core/Client';

const ws: FastifyPluginCallback = async (fastify): Promise<void> => {
	fastify.get<{ Querystring: { clientId?: Snowflake; auth?: string } }>(
		'/ws',
		{
			schema: {
				description: 'Upgrades the HTTP connection and connects to the WebSocket service',
				querystring: {
					type: 'object',
					required: ['clientId', 'auth'],
					properties: {
						clientId: {
							description: 'The client id of the bot',
							type: 'string',
						},
						auth: {
							description: 'The secret of this voicelink instance',
							type: 'string',
						},
					},
				},
			},
			websocket: true,
		},
		(connection, req) => {
			const clientId = req.query.clientId;
			const auth = req.query.auth;
			if (!clientId) {
				return connection.socket.close(WSCloseCodes.NoClientId, JSON.stringify({ message: 'No clientId provided.' }));
			}
			if (auth !== 'secure_this') {
				return connection.socket.close(WSCloseCodes.NoAuth, JSON.stringify({ message: 'No valid auth provided.' }));
			}

			req.log.info(`Client "${clientId}" successfully connected and authenticated to VoiceLink`);

			const client = new Client(connection.socket);
			fastify.clients.set(clientId, client);
			client.ws.send(JSON.stringify({ op: WSOpCodes.Hello, message: 'Welcome to VoiceLink.' }));

			client.ws.on('message', (message: string) => {
				try {
					const json: GatewayVoiceStateUpdateDispatch | GatewayVoiceServerUpdateDispatch = JSON.parse(message);

					switch (json.t) {
						case GatewayDispatchEvents.VoiceStateUpdate: {
							if (json.d.guild_id && json.d.session_id && json.d.user_id === clientId) {
								const adapter = client.adapters.get(json.d.guild_id);
								adapter?.onVoiceStateUpdate(json.d);
							}
							break;
						}

						case GatewayDispatchEvents.VoiceServerUpdate: {
							const adapter = client.adapters.get(json.d.guild_id);
							if (!adapter) {
								return client.ws.close(WSCloseCodes.NoConnectedGuild);
							}

							adapter.onVoiceServerUpdate(json.d);
							break;
						}

						default: {
							break;
						}
					}
				} catch (error) {
					req.log.error(`An error occured parsing WebSocket data: ${error as string}`);
				}
			});

			client.ws.on('close', (code, reason) => {
				req.log.info(`Client "${clientId}" closed the WebSocket connection with code "${code}" and reason "${reason}"`);
				client.subscriptions.forEach((subscription) => subscription.voiceConnection.destroy());
				fastify.clients.delete(clientId);
			});
		},
	);
};

export default ws;
