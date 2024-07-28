const useIntended = true;

/** from https://naruyoko.github.io/googology/0-Y/implementation.html */

export function calcMountain(s: number[]): [number, number][][] {
    let lastLayer = [];
    let mountain = [lastLayer];
    let length = s.length;
    for (let i = 0; i < length; i++) {
        let value = s[i];
        if (!isFinite(value) || !Number.isInteger(value) || value < 1) value = 1; //throw Error("Invalid sequence");
        lastLayer.push([value, 0]);
    }
    let hasNextLayer = true;
    while (hasNextLayer) {
        hasNextLayer = false;
        for (let x = 0; x < length; x++) {
            if (useIntended) {
                let p = x;
                while (p >= 0 && (mountain.length == 1 || mountain[mountain.length - 2][p][1]) && lastLayer[p][0] >= lastLayer[x][0]) {
                    p -= mountain.length == 1 ? 1 : mountain[mountain.length - 2][p][1];
                }
                if (p >= 0 && lastLayer[p][0] && lastLayer[p][0] < lastLayer[x][0]) {
                    lastLayer[x][1] = x - p;
                    hasNextLayer = true;
                }
            } else {
                let xp = 0;
                let p = x;
                while (p >= 0 && (mountain.length == 1 || mountain[mountain.length - 2][p][1])) {
                    p -= mountain.length == 1 ? 1 : mountain[mountain.length - 2][p][1];
                    if (p >= 0 && lastLayer[p][0] && lastLayer[p][0] < lastLayer[x][0]) xp = x - p;
                }
                if (xp) {
                    lastLayer[x][1] = xp;
                    hasNextLayer = true;
                }
            }
        }
        if (hasNextLayer) {
            let currentLayer: [number, number][];
            if (useIntended) {
                currentLayer = [];
                for (let x = 0; x < length; x++) {
                    currentLayer.push([lastLayer[x][1] ? lastLayer[x][0] - lastLayer[x - lastLayer[x][1]][0] : 1, 0]);
                }
            } else {
                currentLayer = [[1, 0]];
                for (let x = 1; x < length; x++) {
                    currentLayer.push([lastLayer[x][0] - lastLayer[x - lastLayer[x][1]][0], 0]);
                }
            }
            mountain.push(currentLayer);
            lastLayer = currentLayer;
        }
    }
    return mountain;
}
function cloneMountain(mountain: [number, number][][]) {
    var newMountain = [];
    for (var i = 0; i < mountain.length; i++) {
        newMountain.push([]);
        for (var j = 0; j < mountain[0].length; j++) {
            newMountain[i].push(mountain[i][j].slice(0));
        }
    }
    return newMountain;
}
export function expand0Y(s: number[], n: number): number[] {
    if(s[s.length-1]===1) return null;
    const mountain = calcMountain(s);
    let height = mountain.length;
    let result = cloneMountain(mountain);
    let cutPosition = mountain[0].length - 1;
    let cutHeight = 0;
    while (cutHeight + 1 < height && mountain[cutHeight][cutPosition][1]) cutHeight++;
    let badRootPosition = cutHeight && cutPosition - mountain[cutHeight - 1][cutPosition][1];
    for (let y = 0; y < height; y++) result[y].pop();
    //Create Mt.Fuji shell
    for (let i = 1; i <= n && cutHeight; i++) { //iteration
        for (let x = badRootPosition; x < cutPosition; x++) { //position
            for (let y = 0; y < height; y++) {
                if (x == badRootPosition && y < cutHeight - 1) result[y].push([NaN, mountain[y][cutPosition][1]]);
                else if (!mountain[y][x][1]) result[y].push([mountain[y][x][0], 0]);
                else if (mountain[y][x][1] && x - mountain[y][x][1] >= badRootPosition && (x > badRootPosition || y < cutHeight)) result[y].push([NaN, mountain[y][x][1]]);
                else result[y].push([NaN, mountain[y][x][1] + (cutPosition - badRootPosition) * i]);
            }
        }
    }
    //Build number from ltr, ttb
    let resultLength = result[0].length;
    for (let x = 0; x < resultLength; x++) {
        for (let y = height - 1; y >= 0; y--) {
            if (isNaN(result[y][x][0])) {
                result[y][x][0] = result[y + 1][x][0] + result[y][x - result[y][x][1]][0];
            }
        }
    }
    let rr = [];
    for (var x = 0; x < resultLength; x++) rr.push(result[0][x][0]);
    return rr;
}