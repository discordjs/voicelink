import type { CommandInteraction, GuildMember } from 'discord.js';

export async function voiceChannelCheck(interaction: CommandInteraction) {
	if ((interaction.member as GuildMember).voice.channelId !== interaction.guild?.me?.voice.channelId) {
		await interaction.editReply('You have to be in the same voice channel as the bot.');
		return true;
	}

	return false;
}
