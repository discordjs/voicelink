import {
	GatewayDispatchEvents,
	GatewayVoiceServerUpdateDispatchData,
	GatewayVoiceStateUpdateDispatchData,
	GatewayVoiceStateUpdateDispatch,
} from 'discord-api-types/v8';
import {
	Client,
	Snowflake,
	Constants,
	Intents,
	MessageSelectMenu,
	SelectMenuInteraction,
	GuildMember,
} from 'discord.js';
import WebSocket from 'ws';
import { nanoid } from 'nanoid';

import { joinChannel } from './joinChannel';
import { leave, loadTrack, pause, resume, search, skip } from './voiceLink';
import { voiceChannelCheck } from './voiceChannelCheck';
import { Queue } from './Queue';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { token } = require('../auth.json');

const client = new Client({
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES],
});
let ws: WebSocket;

/**
 * Sets guild ids, which exist if the bot has an active VoiceConnection to the guild.
 */
const subscriptions = new Set<Snowflake>();

const queues = new Map<Snowflake, Queue>();

client.once('ready', () => {
	console.log('Ready!');
	ws = new WebSocket(`ws://localhost:3000/ws?clientId=${client.user!.id}&auth=secure_this`);

	ws.on('close', (code, reason) => console.log(code, reason));
	ws.on('error', (err) => console.log(err));
	ws.on('message', (message: string) => {
		console.log(message);
		try {
			const json: { op: number; d: GatewayVoiceStateUpdateDispatch } = JSON.parse(message);
			if (json.op === 1) {
				client.guilds.cache.get(json.d.d.guild_id!)?.shard.send(json.d);
			} else if (json.op === 2) {
				const queue = queues.get((json.d as any).guildId);
				queue?.lock();
			} else if (json.op === 3) {
				const queue = queues.get((json.d as any).guildId);
				queue?.lock(false);
				void queue?.processQueue();
			}
		} catch (error) {
			console.error(error);
		}
	});
});

client.ws.on(Constants.WSEvents.VOICE_SERVER_UPDATE, (payload: GatewayVoiceServerUpdateDispatchData) => {
	ws.send(JSON.stringify({ t: GatewayDispatchEvents.VoiceServerUpdate, d: payload }));
});

client.ws.on(Constants.WSEvents.VOICE_STATE_UPDATE, (payload: GatewayVoiceStateUpdateDispatchData) => {
	ws.send(JSON.stringify({ t: GatewayDispatchEvents.VoiceStateUpdate, d: payload }));
});

// This contains the setup code for creating slash commands in a guild. The owner of the bot can send "!deploy" to create them.
client.on(Constants.Events.MESSAGE_CREATE, async (message) => {
	if (!message.guild) {
		return;
	}
	if (!client.application?.owner) {
		await client.application?.fetch();
	}
	if (message.author.id !== client.application?.owner?.id) {
		return;
	}

	if (message.content.toLowerCase() === '!deploy') {
		await message.guild.commands.set([
			{
				name: 'play',
				description: 'Plays a song',
				options: [
					{
						name: 'song',
						type: 'STRING' as const,
						description: 'The URL of the song to play',
						required: true,
					},
				],
			},
			{
				name: 'search',
				description: 'Search a song before queueing',
				options: [
					{
						name: 'query',
						type: 'STRING' as const,
						description: 'The query to search for',
						required: true,
					},
				],
			},
			{
				name: 'skip',
				description: 'Skip to the next song in the queue',
			},
			{
				name: 'queue',
				description: 'See the music queue',
			},
			{
				name: 'pause',
				description: 'Pauses the song that is currently playing',
			},
			{
				name: 'resume',
				description: 'Resume playback of the current song',
			},
			{
				name: 'leave',
				description: 'Leave the voice channel',
			},
		]);
	}
});

client.on('error', console.error);

// Handles slash command interactions
client.on(Constants.Events.INTERACTION_CREATE, async (interaction) => {
	if (interaction.user.id !== client.application?.owner?.id) {
		return;
	}
	if (!interaction.isCommand() || !interaction.guildId) {
		return;
	}
	const subscription = subscriptions.has(interaction.guildId);
	let guildQueue = queues.get(interaction.guildId);

	if (interaction.commandName === 'play') {
		await interaction.defer();
		// Extract the video URL from the command
		const url = interaction.options.get('song')!.value! as string;

		// If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
		// and create a subscription.
		if (!subscription) {
			await joinChannel(interaction);
			subscriptions.add(interaction.guildId);
			guildQueue = new Queue(interaction.user.client.user!.id, interaction.guildId);
			queues.set(interaction.guildId, guildQueue);
		} else if (await voiceChannelCheck(interaction)) {
			return;
		}

		try {
			const track = await loadTrack(url);
			guildQueue?.enqueue(track);
			await interaction.editReply(`Enqueued **${track.title as string}**`);
		} catch (error) {
			console.warn(error);
			await interaction.editReply('Failed to play track, please try again later!');
		}
		return;
	}

	if (interaction.commandName === 'search') {
		await interaction.defer({ ephemeral: true });
		const query = interaction.options.get('query')!.value! as string;
		const customId = nanoid();

		// If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
		// and create a subscription.
		if (!subscription) {
			await joinChannel(interaction);
			subscriptions.add(interaction.guildId);
			guildQueue = new Queue(interaction.user.client.user!.id, interaction.guildId);
			queues.set(interaction.guildId, guildQueue);
		} else if (await voiceChannelCheck(interaction)) {
			return;
		}

		const results = await search(query);

		const selectMenu = new MessageSelectMenu()
			.setCustomId(customId)
			.setPlaceholder('Choose a song')
			.addOptions(
				results.search.map((res: any, idx: number) => ({
					label: `${res.artist.length > 20 ? `${res.artist.slice(0, 20) as string}...` : (res.artist as string)}`,
					description: `${res.title.length > 45 ? `${res.title.slice(0, 45) as string}` : (res.title as string)}`,
					value: idx.toString(),
				})),
			);

		await interaction.editReply({
			content: 'Search results:',
			components: [[selectMenu]],
		});

		const collectedInteraction = await interaction.channel
			?.awaitMessageComponent<SelectMenuInteraction>({
				filter: (collected) =>
					collected.customId === customId &&
					collected.user.id === interaction.user.id &&
					(collected.member as GuildMember).voice.channelId === interaction.guild?.me?.voice.channelId,
				componentType: 'SELECT_MENU',
				time: 15000,
			})
			.catch(async () => {
				try {
					await interaction.editReply({
						content: 'Search aborted, search again if you want to continue.',
						components: [],
					});
				} catch {}
			});
		await collectedInteraction?.update({
			content: 'Loading track data...',
			components: [],
		});

		const track = results.search[Number(collectedInteraction?.values?.[0])];
		guildQueue?.enqueue(track);
		await collectedInteraction?.followUp({
			ephemeral: false,
			content: `Enqueued **${track.title as string}**`,
			components: [],
		});
		return;
	}

	if (!subscription) {
		await interaction.editReply('Not playing in this server.');
		return;
	}

	if (interaction.commandName === 'skip') {
		await interaction.defer();
		if (await voiceChannelCheck(interaction)) {
			return;
		}

		await skip(interaction);
		await interaction.editReply('Skipped song.');
	} else if (interaction.commandName === 'queue') {
		if (!guildQueue || (!guildQueue.current && !guildQueue.queue.length)) {
			await interaction.reply('Nothing is currently playing.');
			return;
		}

		// Print out the current queue, including up to the next 5 tracks to be played.
		const current = `Playing: **${guildQueue.current!.title}**`;

		const queue = guildQueue.queue
			.slice(0, 16)
			.map((track, index) => `**${index + 1})** ${track.title}`)
			.join('\n');

		await interaction.reply(`${current}\n\n${queue}`);
	} else if (interaction.commandName === 'pause') {
		await interaction.defer();
		if (await voiceChannelCheck(interaction)) {
			return;
		}

		await pause(interaction);
		await interaction.editReply({ content: `Paused playback.` });
	} else if (interaction.commandName === 'resume') {
		await interaction.defer();
		if (await voiceChannelCheck(interaction)) {
			return;
		}

		await resume(interaction);
		await interaction.editReply({ content: `Resumed playback.` });
	} else if (interaction.commandName === 'leave') {
		await interaction.defer();
		if (await voiceChannelCheck(interaction)) {
			return;
		}

		await leave(interaction);
		subscriptions.delete(interaction.guildId);
		queues.delete(interaction.guildId);
		await interaction.editReply({ content: `Left channel.` });
	} else {
		await interaction.editReply('Unknown command.');
	}
});

void client.login(token);
