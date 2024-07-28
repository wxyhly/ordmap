import { addv, mulv } from "./veblen.js";

export function yseq2bocf(y: number[], cutoff: number = y.length - 1) {
    for (let i = cutoff; i >= 0; i--) {
        if (y[i] === 1) return addv(yseq2bocf(y, cutoff - 1), 1);
        if (y[i] === 2) return mulv(yseq2bocf(y, cutoff - 1), Infinity);
    }
}