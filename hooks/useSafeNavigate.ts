import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

export function useSafeNavigate(lockMs = 700) {
    const router = useRouter();
    const lockRef = useRef(false);

    const ejecutar = useCallback(
        (accion: () => void) => {
            if (lockRef.current) return;
            lockRef.current = true;
            accion();
            setTimeout(() => {
                lockRef.current = false;
            }, lockMs);
        },
        [lockMs]
    );

    return {
        push: useCallback(
            (...args: Parameters<typeof router.push>) =>
                ejecutar(() => router.push(...args)),
            [ejecutar, router]
        ),
        replace: useCallback(
            (...args: Parameters<typeof router.replace>) =>
                ejecutar(() => router.replace(...args)),
            [ejecutar, router]
        ),
        back: useCallback(() => ejecutar(() => router.back()), [ejecutar, router]),
        dismissTo: useCallback(
            (...args: Parameters<typeof router.dismissTo>) =>
                ejecutar(() => router.dismissTo(...args)),
            [ejecutar, router]
        ),
        dismissAll: useCallback(
            () => ejecutar(() => router.dismissAll()),
            [ejecutar, router]
        ),
        // 👇 Ahora es una función wrapper, no una referencia
        canGoBack: useCallback(() => router.canGoBack(), [router]),
    };
}