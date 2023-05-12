/* eslint-disable max-len */
import { Middleware } from '@reduxjs/toolkit';
import { AppDispatch, MiddlewareOptions, RootState } from '../store';
import { recordingActions } from '../slices/recordingSlice';
import { consumersActions } from '../slices/consumersSlice';
import { producersActions } from '../slices/producersSlice';
import { signalingActions } from '../slices/signalingSlice';
import { uiActions } from '../slices/uiSlice';
import { Logger } from 'edumeet-common';
import { peersActions } from '../slices/peersSlice';

const logger = new Logger('RecordingMiddleware');

const RECORDING_SLICE_SIZE = 1000;
const RECORDING_CONSTRAINTS = {
	videoBitsPerSecond: 8000000,
	video: {
		displaySurface: 'browser',
		width: { ideal: 1920 }
	},
	audio: false,
	advanced: [
		{ width: 1920, height: 1080 },
		{ width: 1280, height: 720 }
	],
	selfBrowserSurface: 'include'
};

const createRecordingMiddleware = ({
	signalingService,
	mediaService,
}: MiddlewareOptions): Middleware => {
	logger.debug('createRecordingMiddleware()');

	let writableStream: FileSystemWritableFileStream;
	let recorder: MediaRecorder;
	let screenStream: MediaStream;
	let recorderStream: MediaStream;
	let audioContext: AudioContext;
	let audioDestination: MediaStreamAudioDestinationNode;
	let mimeType: string;

	const stopRecorder = async () => {
		logger.debug('stopRecorder()');

		try {
			recorder?.stop();
			screenStream?.getTracks().forEach((track) => track.stop());
			recorderStream?.getTracks().forEach((track) => track.stop());
			audioContext?.close();
			audioDestination?.disconnect();

			// Give some time for last recording chunks to come through
			setTimeout(async () => {
				try {
					await writableStream?.close();

					await signalingService.sendRequest('recording:stop');
				} catch (error) {
					logger.error('stopRecorder() [error:%o]', error);
				}
			}, RECORDING_SLICE_SIZE);
		} catch (error) {
			logger.error('stopRecorder() [error:%o]', error);
		}
	};

	const middleware: Middleware = ({
		dispatch, getState
	}: {
		dispatch: AppDispatch,
		getState: () => RootState
	}) =>
		(next) => async (action) => {
			if (signalingActions.connect.match(action)) {
				signalingService.on('notification', (notification) => {
					try {
						switch (notification.method) {
							case 'recording:permissions': {
								if (!getState().ui.privacyDialogOpen) {
									dispatch(uiActions.setUi({
										privacyDialogOpen: true
									}));
								}

								break;
							}

							case 'recording:stop': {
								if (getState().ui.privacyDialogOpen) {
									dispatch(uiActions.setUi({
										privacyDialogOpen: false
									}));
								}

								break;
							}

							default: {
								break;
							}
						}
					} catch (error) {
						logger.error('error on signalService "notification" event [error:%o]', error);
					}
				});
			}

			if (recordingActions.start.match(action)) {
				mimeType = getState().settings.preferredRecorderMimeType;

				logger.debug('recordingActions.start [mimeType:%s]', mimeType);

				if (!MediaRecorder || !window.showSaveFilePicker)
					return logger.error('Recording is not supported');

				const saveFileHandle = await showSaveFilePicker();

				writableStream = await saveFileHandle.createWritable();

				try {
					audioContext = new AudioContext();
					audioDestination = audioContext.createMediaStreamDestination();
					audioContext.createGain().connect(audioDestination);

					const audioProducers = mediaService.getProducers()
						.filter((producer) => producer.appData.source === 'mic');

					for (const producer of audioProducers) {
						if (producer.track) {
							audioContext.createMediaStreamSource(
								new MediaStream([ producer.track ])
							).connect(audioDestination);
						}
					}

					const audioConsumers = mediaService.getConsumers()
						.filter((consumer) => consumer.appData.source === 'mic');

					for (const consumer of audioConsumers) {
						if (consumer.track && consumer.appData.recordable) {
							audioContext.createMediaStreamSource(
								new MediaStream([ consumer.track ])
							).connect(audioDestination);
						}
					}

					const [ mixedAudioTrack ] = audioDestination.stream.getTracks();
	
					screenStream = await navigator.mediaDevices.getDisplayMedia(
						RECORDING_CONSTRAINTS
					);
	
					const [ screenVideotrack ] = screenStream.getVideoTracks();
	
					screenVideotrack.addEventListener('ended', () => {
						logger.debug('screenVideotrack ended event');

						dispatch(recordingActions.stop());
					});

					recorderStream = new MediaStream([ mixedAudioTrack, screenVideotrack ]);
					recorder = new MediaRecorder(recorderStream, { mimeType });

					recorder.addEventListener('error', (event) => {
						logger.error('recording.error', event);

						dispatch(recordingActions.stop());
					});

					recorder.addEventListener('dataavailable', async (event) => {
						logger.debug('recording.dataavailable [data:%o]', event.data);

						if (event.data.size > 0) {
							try {
								await writableStream.write(event.data);
							} catch (error) {
								logger.error('recording.dataavailable [error:%o]', error);
							}
						}
					});

					await signalingService.sendRequest('recording:start');

					recorder.start(RECORDING_SLICE_SIZE);
				} catch (error) {
					logger.error('recordingActions.start [error:%o]', error);
				}
			}

			if (recordingActions.stop.match(action)) {
				logger.debug('recordingActions.stop');

				await stopRecorder();
			}

			if (getState().recording.recording) {
				if (peersActions.updatePeer.match(action)) {
					const { id, recordable } = action.payload;

					const audioConsumers = mediaService.getConsumers()
						.filter((consumer) => consumer.appData.source === 'mic' && consumer.appData.peerId === id);

					for (const consumer of audioConsumers) {
						if (consumer.track && recordable) {
							audioContext.createMediaStreamSource(
								new MediaStream([ consumer.track ])
							).connect(audioDestination);
						}
					}
				}

				if (consumersActions.addConsumer.match(action)) {
					const { id, kind } = action.payload;
	
					if (kind === 'audio') {
						const consumer = mediaService.getConsumer(id);
	
						if (consumer?.track && consumer?.appData.recordable) {
							audioContext.createMediaStreamSource(
								new MediaStream([ consumer.track ])
							).connect(audioDestination);
						}
					}
				}
	
				if (producersActions.addProducer.match(action)) {
					const { id, kind } = action.payload;
	
					if (kind === 'audio') {
						const producer = mediaService.getProducer(id);
	
						if (producer?.track) {
							audioContext.createMediaStreamSource(
								new MediaStream([ producer.track ])
							).connect(audioDestination);
						}
					}
				}
			}

			return next(action);
		};
	
	return middleware;
};

export default createRecordingMiddleware;