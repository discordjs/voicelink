import type { FastifyPluginCallback } from 'fastify';

import { Track } from '../core/track';

const loadTrack: FastifyPluginCallback = async (fastify): Promise<void> => {
	fastify.post<{ Body: { track?: string } }>(
		'/load_track',
		{
			schema: {
				description: 'Get information about a track',
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
						description: 'Failure response by not providing a track',
						type: 'object',
					},
				},
			},
		},
		async (req, reply) => {
			const track = req.body.track;
			if (!track) {
				return reply.code(400).send();
			}

			return Track.from(track);
		},
	);
};

export default loadTrack;
