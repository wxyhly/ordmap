import { BOCF, BOCFNode } from "./bocf.js";
import { Chunk, HandleCanvas } from "./draw.js";
const inf = "inf";
export class SaveLoad {
    handle: HandleCanvas;
    storageKey = "ordmap-save";
    constructor(handle: HandleCanvas) {
        this.handle = handle;
    }
    stateChangeTimer: number | boolean = false;
    timeOut = 3000;
    trySave() {
        if (this.stateChangeTimer === false) {
            this.stateChangeTimer = setTimeout(() => {
                this.save();
                this.stateChangeTimer = false;
            }, this.timeOut);
        }
    }
    stringifyOrd(o: BOCF) {
        if (!o) return o;
        if ((o as any) === Infinity) return inf;
        if (typeof o === "number") return o;
        return { op: o.op, val: o.val.map(v => this.stringifyOrd(v as BOCFNode)) };
    }
    parseOrd(o: BOCF | typeof inf): BOCF {
        if (!o) return o as BOCF;
        if (o === inf) return Infinity;
        if (typeof o === "number") return o;
        if (o.val) {
            for (let i = 0; i < o.val.length; i++) {
                o.val[i] = this.parseOrd(o.val[i] as BOCFNode) as BOCF;
            }
        }
        return o;
    }
    parseCoord(o: Chunk[]): Chunk[] {
        return o.map(e => ({
            ord: this.parseOrd(e.ord),
            preOrd: this.parseOrd(e.preOrd),
            dens: e.dens,
            max: e.max,
            min: e.min,
            preOrdDens: e.preOrdDens,
            lastMax: e.lastMax,
            lastMin: e.lastMin,
            lastDens: e.lastDens
        }));
    }
    stringifyCoord(o: Chunk[]) {
        return o.map(e => ({
            ord: this.stringifyOrd(e.ord),
            preOrd: this.stringifyOrd(e.preOrd),
            dens: e.dens,
            max: e.max,
            min: e.min,
            preOrdDens: e.preOrdDens,
            lastMax: e.lastMax,
            lastMin: e.lastMin,
            lastDens: e.lastDens
        }));
    }
    save() {
        localStorage.setItem(this.storageKey, JSON.stringify([this.handle.range, this.stringifyCoord(this.handle.coord)]));
    }
    load() {
        const coordJson = localStorage.getItem(this.storageKey);
        if (!coordJson) return false;
        let coord: [typeof this.handle.range, typeof this.handle.coord];
        try {
            coord = JSON.parse(coordJson);
        } catch (e) {
            return false;
        }
        let precoord;
        [this.handle.range, precoord] = coord;
        this.handle.coord = this.parseCoord(precoord);
        this.handle.draw();
    }
}