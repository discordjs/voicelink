import { CommandInteraction, GuildMember } from 'discord.js';
import { join } from './voiceLink';

export async function joinChannel(interaction: CommandInteraction) {
	if (interaction.member instanceof GuildMember && interaction.member.voice.channelId) {
		const channelId = interaction.member.voice.channelId;
		await join(interaction, channelId);
	} else {
		// If there is no subscription, tell the user they need to join a channel.
		await interaction.editReply('Join a voice channel and then try that again!');
	}
}
