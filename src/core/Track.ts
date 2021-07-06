import { AudioResource, createAudioResource, demuxProbe, StreamType } from '@discordjs/voice';
import { FFmpeg } from 'prism-media';
import youtubedl, { raw as youtubedlraw } from 'youtube-dl-exec';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FFMPEG_PCM_ARGUMENTS = ['-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2'];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FFMPEG_OPUS_ARGUMENTS = [
	'-analyzeduration',
	'0',
	'-loglevel',
	'0',
	'-acodec',
	'libopus',
	'-f',
	'opus',
	'-ar',
	'48000',
	'-ac',
	'2',
];

export interface TrackData {
	url: string;
	streamUrl: string;
	artist: string | undefined;
	duration: number;
	description: string;
	title: string;
	thumbnail: string;
	onStart: () => void;
	onFinish: () => void;
	onError: (error: Error) => void;
}

export type TrackDataInput = Omit<TrackData, 'onStart' | 'onFinish' | 'onError'> &
	Partial<Pick<TrackData, 'onStart' | 'onFinish' | 'onError'>>;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export class Track implements TrackData {
	public readonly artist = this.data.artist;

	public readonly duration = this.data.duration;

	public readonly description = this.data.description;

	public readonly title = this.data.title;

	public readonly thumbnail = this.data.thumbnail;

	public readonly url = this.data.url;

	public readonly streamUrl = this.data.streamUrl;

	public readonly onStart = this.data.onStart ?? noop;

	public readonly onFinish = this.data.onFinish ?? noop;

	public readonly onError = this.data.onError ?? noop;

	private constructor(public readonly data: TrackDataInput) {}

	public createAudioResource(youtubedl = false): Promise<AudioResource<Track>> {
		return new Promise((resolve, reject) => {
			if (youtubedl) {
				const process = youtubedlraw(
					this.streamUrl,
					{
						o: '-',
						q: '',
					},
					{ stdio: ['ignore', 'pipe', 'ignore'] },
				);
				if (!process.stdout) {
					reject(new Error('No stdout'));
					return;
				}
				const stream = process.stdout;
				const onError = (error: Error) => {
					if (!process.killed) process.kill();
					stream.resume();
					reject(error);
				};
				process
					.once('spawn', () => {
						demuxProbe(stream)
							.then((probe) => resolve(createAudioResource(probe.stream, { metadata: this, inputType: probe.type })))
							.catch(onError);
					})
					.catch(onError);
			} else {
				const stream = new FFmpeg({
					args: [
						'-reconnect',
						'1',
						'-reconnect_streamed',
						'1',
						'-reconnect_on_network_error',
						'1',
						'-reconnect_on_http_error',
						'4xx,5xx',
						'-reconnect_delay_max',
						'30',
						'-i',
						this.streamUrl,
						...FFMPEG_OPUS_ARGUMENTS,
					],
					shell: false,
				});

				resolve(createAudioResource(stream, { metadata: this, inputType: StreamType.OggOpus }));
			}
		});
	}

	public toJSON() {
		return {
			artist: this.artist,
			duration: this.duration,
			description: this.description,
			title: this.title,
			thumbnail: this.thumbnail,
			url: this.url,
		};
	}

	public static async from(
		url: string | TrackDataInput,
		methods: Pick<Track, 'onStart' | 'onFinish' | 'onError'> | Record<string, () => void> = {},
	): Promise<Track | { error: string }> {
		if (typeof url === 'object') {
			return new Track({ ...url, ...methods });
		}

		try {
			const { artist, duration, description, title, thumbnail, webpage_url } = await youtubedl(url, {
				dumpJson: '',
			});

			const { stdout: streamUrl } = await youtubedlraw(url, {
				g: '',
				f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio/best',
			});

			return new Track({
				artist,
				duration,
				description,
				title,
				thumbnail,
				url: webpage_url,
				streamUrl,
				...methods,
			});
		} catch (error) {
			console.log(error);
			return { error: 'Could not instantiate track from URL/search.' };
		}
	}
}
