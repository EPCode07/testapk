// components/InputTexto.tsx
//
// TextInput "no controlado": el texto vive en el campo nativo y React NO lo vuelve a empujar
// en cada tecla. Así el teclado puede componer tildes y acentos sin que el valor de React
// pise lo que está escribiendo (el síntoma de "oracioón").
//
// - Valor inicial:        valorInicial
// - Leer lo escrito:      ref.getValue()   (o escuchar onCambio)
// - Cambiarlo desde fuera (dictado por voz, limpiar…): ref.setValue('texto')
//
// Importante: onCambio puede actualizar un estado del padre sin problema, porque este
// campo no tiene `value`: un re-render del padre no reescribe el texto.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

export interface InputTextoRef {
    getValue: () => string;
    setValue: (texto: string) => void;
    focus: () => void;
    blur: () => void;
}

type Props = Omit<TextInputProps, 'value' | 'defaultValue' | 'onChangeText'> & {
    valorInicial?: string;
    onCambio?: (texto: string) => void;
};

const InputTexto = forwardRef<InputTextoRef, Props>(function InputTexto(
    { valorInicial = '', onCambio, ...resto },
    ref
) {
    const input = useRef<TextInput>(null);
    const texto = useRef(valorInicial);
    const reenfocar = useRef(false);

    // Cuando el texto cambia desde fuera, el campo se vuelve a montar con el nuevo valor inicial
    // (patrón recomendado por React para reiniciar un componente: cambiar su `key`).
    const [version, setVersion] = useState(0);
    const [inicial, setInicial] = useState(valorInicial);

    useEffect(() => {
        if (version > 0 && reenfocar.current) {
            reenfocar.current = false;
            const t = setTimeout(() => input.current?.focus(), 30);
            return () => clearTimeout(t);
        }
    }, [version]);

    const setValue = useCallback(
        (nuevo: string) => {
            texto.current = nuevo;
            reenfocar.current = true;
            setInicial(nuevo);
            setVersion((v) => v + 1);
            onCambio?.(nuevo);
        },
        [onCambio]
    );

    useImperativeHandle(
        ref,
        () => ({
            getValue: () => texto.current,
            setValue,
            focus: () => input.current?.focus(),
            blur: () => input.current?.blur(),
        }),
        [setValue]
    );

    return (
        <TextInput
            key={version}
            ref={input}
            {...resto}
            defaultValue={inicial}
            onChangeText={(t) => {
                texto.current = t;
                onCambio?.(t);
            }}
        />
    );
});

export default InputTexto;