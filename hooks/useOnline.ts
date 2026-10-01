import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useOnline() {
    const [online, setOnline] = useState(true);

    useEffect(() => {
        const unsub = NetInfo.addEventListener((state) => {
            setOnline(!!state.isConnected && state.isInternetReachable !== false);
        });
        return () => unsub();
    }, []);

    return online;
}