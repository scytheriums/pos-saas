declare module 'esc-pos-encoder' {
    export default class EscPosEncoder {
        initialize(): EscPosEncoder;
        codepage(codepage: string): EscPosEncoder;
        align(alignment: 'left' | 'center' | 'right'): EscPosEncoder;
        bold(enabled: boolean): EscPosEncoder;
        size(width: number, height?: number): EscPosEncoder;
        line(text: string): EscPosEncoder;
        newline(): EscPosEncoder;
        underline(enabled: boolean): EscPosEncoder;
        cut(type?: 'partial' | 'full'): EscPosEncoder;
        encode(): Uint8Array;
        table(columns: Array<{ width: number; align?: 'left' | 'center' | 'right' }>, data: string[][]): EscPosEncoder;
        raw(data: number[]): EscPosEncoder;
    }
}
