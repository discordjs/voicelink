import { DiscordGatewayAdapterLibraryMethods, joinVoiceChannel } from '@discordjs/voice';
import type { Snowflake } from 'discord-api-types';
import type WebSocket from 'ws';

import { WSOpCodes } from '../constants';
import { Subscription } from './Subscription';

export class Client {
	public readonly subscriptions = new Map<Snowflake, Subscription>();

	public readonly adapters = new Map<Snowflake, DiscordGatewayAdapterLibraryMethods>();

	public constructor(public readonly ws: WebSocket) {}

	public createSubscription(guildId: Snowflake, channelId: Snowflake) {
		const subscription = new Subscription(
			joinVoiceChannel({
				guildId,
				channelId,
				adapterCreator: (methods) => {
					this.adapters.set(guildId, methods);

					return {
						sendPayload: (data) => {
							this.ws.send(JSON.stringify({ op: WSOpCodes.VoiceStateUpdate, d: data }));
							return true;
						},
						destroy: () => {
							this.adapters.delete(guildId);
							this.subscriptions.delete(guildId);
						},
					};
				},
			}),
		);

		this.subscriptions.set(guildId, subscription);
	}
}
