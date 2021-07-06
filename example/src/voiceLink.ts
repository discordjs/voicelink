import type { Snowflake } from 'discord-api-types/v8';
import type { CommandInteraction } from 'discord.js';
import fetch from 'node-fetch';

export async function join(interaction: CommandInteraction, channelId: Snowflake) {
	await fetch(`http://localhost:3000/${interaction.client.user!.id}/${interaction.guildId!}/subscription`, {
		method: 'POST',
		body: JSON.stringify({ channelId }),
		headers: { 'Content-Type': 'application/json' },
	});
}

export function loadTrack(url: string) {
	return fetch(`http://localhost:3000/load_track`, {
		method: 'POST',
		body: JSON.stringify({ track: url }),
		headers: { 'Content-Type': 'application/json' },
	}).then((res) => res.json());
}

export function queue({ clientId, guildId }: { clientId: Snowflake; guildId: Snowflake }, url: string) {
	return fetch(`http://localhost:3000/${clientId}/${guildId}/subscription/queue`, {
		method: 'POST',
		body: JSON.stringify({ track: url }),
		headers: { 'Content-Type': 'application/json' },
	}).then((res) => res.json());
}

export function search(query: string) {
	return fetch(`http://localhost:3000/search`, {
		method: 'POST',
		body: JSON.stringify({ search: query }),
		headers: { 'Content-Type': 'application/json' },
	}).then((res) => res.json());
}

export function skip(interaction: CommandInteraction) {
	return fetch(`http://localhost:3000/${interaction.client.user!.id}/${interaction.guildId!}/subscription/skip`, {
		method: 'POST',
	});
}

export function pause(interaction: CommandInteraction) {
	return fetch(`http://localhost:3000/${interaction.client.user!.id}/${interaction.guildId!}/subscription/pause`, {
		method: 'POST',
	});
}

export function resume(interaction: CommandInteraction) {
	return fetch(`http://localhost:3000/${interaction.client.user!.id}/${interaction.guildId!}/subscription/resume`, {
		method: 'POST',
	});
}

export function leave(interaction: CommandInteraction) {
	return fetch(`http://localhost:3000/${interaction.client.user!.id}/${interaction.guildId!}/subscription`, {
		method: 'DELETE',
	});
}
