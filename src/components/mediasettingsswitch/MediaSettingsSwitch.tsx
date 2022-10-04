import { FormControlLabel, Switch } from '@mui/material';
import { updateMic } from '../../store/actions/mediaActions';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import settingsSlice from '../../store/slices/settingsSlice';
import {
	autoGainControlLabel,
	echoCancellationLabel,
	enableOpusDtxLabel,
	enableOpusFecLabel,
	noiseSuppressionLabel,
	voiceActivatedUnmuteLabel
} from '../translated/translatedComponents';

type SettingType = 'echoCancellation' |
	'autoGainControl' |
	'noiseSuppression' |
	'voiceActivatedUnmute' |
	'enableOpusDtx' |
	'enableOpusFec';

interface MediaSettingsSwitchProps {
	setting: SettingType,
}

const labels = {
	'echoCancellation': echoCancellationLabel,
	'autoGainControl': autoGainControlLabel,
	'noiseSuppression': noiseSuppressionLabel,
	'voiceActivatedUnmute': voiceActivatedUnmuteLabel,
	'enableOpusDtx': enableOpusDtxLabel,
	'enableOpusFec': enableOpusFecLabel
};

const MediaSettingsSwitch = ({
	setting
}: MediaSettingsSwitchProps): JSX.Element => {
	const dispatch = useAppDispatch();
	const switchChecked = useAppSelector((state) => {
		switch (setting) {
			case 'echoCancellation':
				return state.settings.echoCancellation;

			case 'autoGainControl':
				return state.settings.autoGainControl;

			case 'noiseSuppression':
				return state.settings.noiseSuppression;

			case 'voiceActivatedUnmute':
				return state.settings.voiceActivatedUnmute;

			case 'enableOpusDtx':
				return state.settings.opusDtx;

			case 'enableOpusFec':
				return state.settings.opusFec;
		}
	});

	const onChangeCallback = (event: React.ChangeEvent<HTMLInputElement>): void => {
		switch (setting) {
			case 'echoCancellation': {
				dispatch(settingsSlice.actions.setEchoCancellation(event.target.checked));
				break;
			}

			case 'autoGainControl': {
				dispatch(settingsSlice.actions.setAutoGainControl(event.target.checked));
				break;
			}

			case 'noiseSuppression': {
				dispatch(settingsSlice.actions.setNoiseSuppression(event.target.checked));
				break;
			}

			case 'voiceActivatedUnmute': {
				dispatch(settingsSlice.actions.setNoiseSuppression(event.target.checked));
				break;
			}

			case 'enableOpusDtx': {
				dispatch(settingsSlice.actions.setNoiseSuppression(event.target.checked));
				break;
			}

			case 'enableOpusFec': {
				dispatch(settingsSlice.actions.setNoiseSuppression(event.target.checked));
				break;
			}
		}
		dispatch(updateMic());
	};

	return (
		<FormControlLabel
			control={
				<Switch 
					color="primary"
					checked={ switchChecked }
					onChange={ onChangeCallback }
				/>
			}
			label={ labels[setting]() }
		/>
	);
};

export default MediaSettingsSwitch;