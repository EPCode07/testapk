import Svg, { Path } from 'react-native-svg';

interface Props {
    size?: number;
    color?: string;
    strokeWidth?: number;
}

export default function IconUbicacion({
    size = 24,
    color = '#111827',
    strokeWidth = 2.5,
}: Props) {
    return (
        <Svg width={size} height={size} viewBox="0 0 37 35" fill="none">
            <Path d="M3.02271 17.4881H7.55665" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M28.715 17.4881H33.2489" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M18.1357 2.91467V7.28669" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M18.1357 27.6895V32.0615" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M18.1358 27.6895C23.9786 27.6895 28.715 23.1222 28.715 17.4881C28.715 11.8541 23.9786 7.28674 18.1358 7.28674C12.2931 7.28674 7.55664 11.8541 7.55664 17.4881C7.55664 23.1222 12.2931 27.6895 18.1358 27.6895Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M18.1358 21.8601C20.6398 21.8601 22.6697 19.9027 22.6697 17.4881C22.6697 15.0735 20.6398 13.1161 18.1358 13.1161C15.6317 13.1161 13.6018 15.0735 13.6018 17.4881C13.6018 19.9027 15.6317 21.8601 18.1358 21.8601Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}