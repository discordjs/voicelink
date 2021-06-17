export enum WSOpCodes {
	Hello = 0,
	VoiceStateUpdate = 1,
	OnStart = 2,
	OnFinish = 3,
	OnError = 4,
}

export enum WSCloseCodes {
	NoClientId = 4001,
	NoAuth = 4002,
	NoConnectedGuild = 4003,
}

export enum RESTErrorCodes {}
