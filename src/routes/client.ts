import type { FastifyPluginCallback } from 'fastify';
import type { Snowflake } from 'discord-api-types/v8';

import { WSOpCodes } from '../constants';
import { Track, TrackDataInput } from '../core/track';

const user: FastifyPluginCallback = async (fastify): Promise<void> => {
	fastify.post<{ Params: { clientId: Snowflake; guildId: Snowflake }; Body: { channelId?: Snowflake } }>(
		'/:clientId/:guildId/subscription',
		{
			schema: {
				description: 'Creates a new subscription in the specified guild and channel for the specified client',
				params: {
					type: 'object',
					properties: {
						clientId: {
							description: 'The client id of the bot',
							type: 'string',
						},
						guildId: {
							description: 'The guild id of the guild to create a subscription in',
							type: 'string',
						},
					},
				},
				body: {
					type: 'object',
					required: ['channelId'],
					properties: {
						channelId: {
							description: 'The channel id of the voice channel to join',
							type: 'string',
						},
					},
				},
				response: {
					204: {
						description: 'Successful response either creating or reusing a subscription',
						type: 'null',
					},
					400: {
						description: 'Failure response by not providing a channel id or having an active WebSocket connection',
						type: 'object',
					},
				},
			},
		},
		async (req, reply) => {
			const clientId = req.params.clientId;
			const guildId = req.params.guildId;
			const channelId = req.body.channelId;
			if (!channelId) {
				req.log.error(`Client "${clientId}" provided no channelId`);
				return reply.code(400).send();
			}

			const client = fastify.clients.get(clientId);
			if (!client) {
				req.log.error(`Client "${clientId}" has no active WebSocket connection`);
				return reply.code(400).send();
			}

			if (client.subscriptions.has(guildId)) {
				req.log.error(`Client "${clientId}" already created a subscription`);
				return reply.code(204).send();
			}

			client.createSubscription(guildId, channelId);

			return reply.code(204).send();
		},
	);

	fastify.delete<{ Params: { clientId: Snowflake; guildId: Snowflake } }>(
		'/:clientId/:guildId/subscription',
		{
			schema: {
				description: 'Deletes a subscription in the specified guild for the specified client',
				params: {
					type: 'object',
					properties: {
						clientId: {
							description: 'The client id of the bot',
							type: 'string',
						},
						guildId: {
							description: 'The guild id of the guild to delete a subscription in',
							type: 'string',
						},
					},
				},
				response: {
					204: {
						description: 'Successful response for deleting a subscription',
						type: 'object',
					},
					400: {
						description:
							'Failure response by not having an active WebSocket connection or providing a guild id which has no active subscriptions',
						type: 'object',
					},
				},
			},
		},
		async (req, reply) => {
			const clientId = req.params.clientId;
			const guildId = req.params.guildId;

			const client = fastify.clients.get(clientId);
			if (!client) {
				req.log.error(`Client "${clientId}" has no active WebSocket connection`);
				return reply.code(400).send();
			}

			const subscription = client.subscriptions.get(guildId);
			if (!subscription) {
				req.log.error(`Client "${clientId}" has no active subscription`);
				return reply.code(400).send();
			}

			subscription.voiceConnection.destroy();

			return reply.code(204).send();
		},
	);

	fastify.post<{ Params: { clientId: Snowflake; guildId: Snowflake }; Body: { track?: string | TrackDataInput } }>(
		'/:clientId/:guildId/subscription/queue',
		{
			schema: {
				description: 'Queues up a track in the specified guild for the specified client',
				params: {
					type: 'object',
					properties: {
						clientId: {
							description: 'The client id of the bot',
							type: 'string',
						},
						guildId: {
							description: 'The guild id of the guild to delete a subscription in',
							type: 'string',
						},
					},
				},
				body: {
					type: 'object',
					required: ['track'],
					properties: {
						track: {
							description: 'The track to queue up',
							type: 'string',
						},
					},
				},
				response: {
					201: {
						description: 'Successful response for queueing up a track',
						type: 'object',
						properties: {
							artist: {
								description: 'The artist of the track, if any',
								type: 'string',
							},
							duration: {
								description: 'The duration of the track',
								type: 'number',
							},
							description: {
								description: 'The description of the track, if any',
								type: 'string',
							},
							title: {
								description: 'The titel of the track',
								type: 'string',
							},
							thumbnail: {
								description: 'The thumbnail of the track',
								type: 'string',
							},
							url: {
								description: 'The url of the track',
								type: 'string',
							},
							streamUrl: {
								description: 'The stream url of the track',
								type: 'string',
							},
						},
					},
					400: {
						description:
							'Failure response by not providing a track, not having an active WebSocket connection, providing a guild id which has no active subscriptions or the URL provided could not be converted into a track',
						type: 'object',
					},
				},
			},
		},
		async (req, reply) => {
			const clientId = req.params.clientId;
			const guildId = req.params.guildId;
			const track = req.body.track;
			if (!track) {
				return reply.code(400).send();
			}

			const client = fastify.clients.get(clientId);
			if (!client) {
				req.log.error(`Client "${clientId}" has no active WebSocket connection`);
				return reply.code(400).send();
			}

			const subscription = client.subscriptions.get(guildId);
			if (!subscription) {
				req.log.error(`Client "${clientId}" has no active subscription`);
				return reply.code(401).send();
			}

			const toPlay = await Track.from(track, {
				onStart() {
					client.ws.send(JSON.stringify({ op: WSOpCodes.OnStart, d: { guildId } }));
				},
				onFinish() {
					client.ws.send(JSON.stringify({ op: WSOpCodes.OnFinish, d: { guildId } }));
				},
				onError() {
					client.ws.send(JSON.stringify({ op: WSOpCodes.OnError, d: { guildId } }));
				},
			});
			if (!(toPlay instanceof Track)) {
				req.log.error(`Client "${clientId}" provided invalid input which could not be converted into a track`);
				req.log.info(track);
				req.log.info(toPlay);
				return reply.code(400).send();
			}

			try {
				const resource = await toPlay.createAudioResource();
				subscription.audioPlayer.play(resource);
			} catch (error) {
				toPlay.onError(error as Error);
				return reply.code(400).send();
			}

			return reply.code(201).send({ ...toPlay });
		},
	);

	fastify.post<{ Params: { clientId: Snowflake; guildId: Snowflake }; Body: { track?: string | TrackDataInput } }>(
		'/:clientId/:guildId/subscription/skip',
		{
			schema: {
				description: 'Skips a track in the specified guild and channel for the specified client',
				params: {
					type: 'object',
					properties: {
						clientId: {
							description: 'The client id of the bot',
							type: 'string',
						},
						guildId: {
							description: 'The guild id of the guild to skip a track in',
							type: 'string',
						},
					},
				},
				response: {
					204: {
						description: 'Successful response for skipping a track',
						type: 'object',
					},
					400: {
						description:
							'Failure response by not having an active WebSocket connection or providing a guild id which has no active subscriptions',
						type: 'object',
					},
				},
			},
		},
		async (req, reply) => {
			const clientId = req.params.clientId;
			const guildId = req.params.guildId;

			const client = fastify.clients.get(clientId);
			if (!client) {
				req.log.error(`Client "${clientId}" has no active WebSocket connection`);
				return reply.code(400).send();
			}

			const subscription = client.subscriptions.get(guildId);
			if (!subscription) {
				req.log.error(`Client "${clientId}" has no active subscription`);
				return reply.code(401).send();
			}

			subscription.audioPlayer.stop();

			return reply.code(204).send();
		},
	);

	fastify.post<{ Params: { clientId: Snowflake; guildId: Snowflake }; Body: { track?: string | TrackDataInput } }>(
		'/:clientId/:guildId/subscription/pause',
		{
			schema: {
				description: 'Pauses a track in the specified guild and channel for the specified client',
				params: {
					type: 'object',
					properties: {
						clientId: {
							description: 'The client id of the bot',
							type: 'string',
						},
						guildId: {
							description: 'The guild id of the guild to pause a track in',
							type: 'string',
						},
					},
				},
				response: {
					204: {
						description: 'Successful response for pausing a track',
						type: 'object',
					},
					400: {
						description:
							'Failure response by not having an active WebSocket connection or providing a guild id which has no active subscriptions',
						type: 'object',
					},
				},
			},
		},
		async (req, reply) => {
			const clientId = req.params.clientId;
			const guildId = req.params.guildId;

			const client = fastify.clients.get(clientId);
			if (!client) {
				req.log.error(`Client "${clientId}" has no active WebSocket connection`);
				return reply.code(400).send();
			}

			const subscription = client.subscriptions.get(guildId);
			if (!subscription) {
				req.log.error(`Client "${clientId}" has no active subscription`);
				return reply.code(401).send();
			}

			subscription.audioPlayer.pause();

			return reply.code(204).send();
		},
	);

	fastify.post<{ Params: { clientId: Snowflake; guildId: Snowflake }; Body: { track?: string | TrackDataInput } }>(
		'/:clientId/:guildId/subscription/resume',
		{
			schema: {
				description: 'Resumes a track in the specified guild and channel for the specified client',
				params: {
					type: 'object',
					properties: {
						clientId: {
							description: 'The client id of the bot',
							type: 'string',
						},
						guildId: {
							description: 'The guild id of the guild to resume a track in',
							type: 'string',
						},
					},
				},
				response: {
					204: {
						description: 'Successful response for resuming a track',
						type: 'object',
					},
					400: {
						description:
							'Failure response by not having an active WebSocket connection or providing a guild id which has no active subscriptions',
						type: 'object',
					},
				},
			},
		},
		async (req, reply) => {
			const clientId = req.params.clientId;
			const guildId = req.params.guildId;

			const client = fastify.clients.get(clientId);
			if (!client) {
				req.log.error(`Client "${clientId}" has no active WebSocket connection`);
				return reply.code(400).send();
			}

			const subscription = client.subscriptions.get(guildId);
			if (!subscription) {
				req.log.error(`Client "${clientId}" has no active subscription`);
				return reply.code(401).send();
			}

			subscription.audioPlayer.unpause();

			return reply.code(204).send();
		},
	);
};

export default user;
