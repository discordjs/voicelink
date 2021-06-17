import type { FastifyPluginCallback } from 'fastify';
import youtubedl from 'youtube-dl-exec';

const searchTrack: FastifyPluginCallback = async (fastify): Promise<void> => {
	fastify.post<{ Body: { search?: string } }>(
		'/search',
		{
			schema: {
				description: 'Search for a track',
				body: {
					type: 'object',
					required: ['search'],
					properties: {
						search: {
							description: 'The search query',
							type: 'string',
						},
					},
				},
				response: {
					200: {
						description: 'Successful response for searching a track',
						type: 'object',
						properties: {
							search: {
								type: 'array',
								items: {
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
									},
								},
							},
						},
					},
					400: {
						description: 'Failure response by not providing a search query',
						type: 'object',
					},
				},
			},
		},
		async (req, reply) => {
			const search = req.body.search;
			if (!search) {
				return reply.code(400).send();
			}

			// @ts-ignore
			const { entries } = await youtubedl(`ytsearch10:${search}`, { dumpSingleJson: '' });

			return reply.code(200).send({
				search: entries.map((entry: any) => ({
					artist: entry.artist ?? 'Unknown',
					duration: entry.duration ?? 0,
					description: entry.description ?? 'No description.',
					title: entry.title,
					thumbnail: entry.thumbnail,
					url: entry.webpage_url,
				})),
			});
		},
	);
};

export default searchTrack;
