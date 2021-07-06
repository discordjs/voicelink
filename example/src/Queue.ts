import type { Snowflake } from 'discord-api-types/v8';
import { queue } from './voiceLink';

interface QueueTrack {
	artist: string;
	duration: number;
	description: string;
	title: string;
	thumbnail: string;
	url: string;
	streamUrl?: string;
}

export class Queue {
	public current: QueueTrack | null = null;
	public queue: QueueTrack[] = [];
	public queueLock = false;

	public constructor(public readonly clientId: Snowflake, public readonly guildId: Snowflake) {}

	/**
	 * Adds a new Track to the queue.
	 *
	 * @param track The track to add to the queue
	 */
	public enqueue(track: QueueTrack) {
		this.queue.push(track);
		void this.processQueue();
	}

	/**
	 * Locks the queue
	 */
	public lock(locked = true) {
		this.queueLock = locked;
	}

	/**
	 * Attempts to play a Track from the queue
	 */
	public async processQueue(): Promise<void> {
		if (this.queueLock || this.queue.length === 0) {
			return;
		}
		// Lock the queue to guarantee safe access
		this.queueLock = true;

		// Take the first item from the queue. This is guaranteed to exist due to the non-empty check above.
		this.current = this.queue.shift()!;
		try {
			// Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
			await queue({ clientId: this.clientId, guildId: this.guildId }, this.current.streamUrl ?? this.current.url);
			this.queueLock = false;
		} catch (error) {
			// If an error occurred, try the next item of the queue instead
			console.log(error);
			this.queueLock = false;
			return this.processQueue();
		}
	}
}
