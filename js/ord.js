const outFn = (n) => {
    n *= 10;
    const ns = n * 10;
    const s = 1 / (1 + ns * ns);
    return s * n * 0.01 + (1 - Math.exp(-n * 0.05)) * (1 - s);
};
const invDens = (v, n) => {
    const u = v * v * Math.PI / 2;
    return Math.cos(u);
};
export const rescaleX = new Array(1024).fill(0).map((_, idx) => outFn(idx));
export const rescaleDeltaX = rescaleX.map((_, idx) => idx ? rescaleX[idx] - rescaleX[idx - 1] : 0);
export const rescaleY = rescaleX.map((v, idx) => invDens(v, idx));
//# sourceMappingURL=ord.js.map