import Svg, { Path } from 'react-native-svg';

const SyncIconRotated = ({ width = 45, height = 45, color = 'white', strokeWidth = 2 }) => (
    <Svg
        width={width}
        height={height}
        viewBox="0 0 45 45"
        fill="none"
        style={{ transform: [{ rotate: '222deg' }] }}
    >
        <Path
            d="M5.625 22.5C5.625 18.0245 7.4029 13.7322 10.5676 10.5676C13.7322 7.4029 18.0245 5.625 22.5 5.625C27.2176 5.64275 31.7457 7.48354 35.1375 10.7625L39.375 15"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M39.375 5.625V15H30"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M39.375 22.5C39.375 26.9755 37.5971 31.2677 34.4324 34.4324C31.2677 37.5971 26.9755 39.375 22.5 39.375C17.7824 39.3573 13.2543 37.5165 9.8625 34.2375L5.625 30"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M15 30H5.625V39.375"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

export default SyncIconRotated;