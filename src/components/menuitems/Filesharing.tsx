import { MenuItem } from '@mui/material';
import {
	useAppDispatch,
	useAppSelector,
	usePermissionSelector,
} from '../../store/hooks';
import {
	shareFileLabel,
} from '../translated/translatedComponents';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { MenuItemProps } from '../floatingmenu/FloatingMenu';
import { permissions } from '../../utils/roles';
import MoreActions from '../moreactions/MoreActions';
import { uiActions } from '../../store/slices/uiSlice';
import { filesLengthSelector } from '../../store/selectors';
import PulsingBadge from '../pulsingbadge/PulsingBadge';

const Filesharing = ({
	onClick
}: MenuItemProps): JSX.Element => {
	const dispatch = useAppDispatch();
	const hasFilesharingPermission = usePermissionSelector(permissions.SHARE_FILE);
	const filesharingOpen = useAppSelector((state) => state.ui.filesharingOpen);
	const files = useAppSelector(filesLengthSelector);
	const fileTip = shareFileLabel();

	return (
		<MenuItem
			aria-label={fileTip}
			disabled={!hasFilesharingPermission}
			onClick={() => {
				onClick();

				dispatch(uiActions.setUi({ filesharingOpen: !filesharingOpen }));
			}}
		>
			<PulsingBadge
				color='primary'
				badgeContent={files}
			>
				<FileDownloadIcon />
			</PulsingBadge>
			<MoreActions>
				{ fileTip }
			</MoreActions>
		</MenuItem>
	);
};

export default Filesharing;