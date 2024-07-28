const inf = "inf";
export class SaveLoad {
    handle;
    storageKey = "ordmap-save";
    constructor(handle) {
        this.handle = handle;
    }
    stateChangeTimer = false;
    timeOut = 3000;
    trySave() {
        if (this.stateChangeTimer === false) {
            this.stateChangeTimer = setTimeout(() => {
                this.save();
                this.stateChangeTimer = false;
            }, this.timeOut);
        }
    }
    stringifyOrd(o) {
        if (!o)
            return o;
        if (o === Infinity)
            return inf;
        if (typeof o === "number")
            return o;
        return { op: o.op, val: o.val.map(v => this.stringifyOrd(v)) };
    }
    parseOrd(o) {
        if (!o)
            return o;
        if (o === inf)
            return Infinity;
        if (typeof o === "number")
            return o;
        if (o.val) {
            for (let i = 0; i < o.val.length; i++) {
                o.val[i] = this.parseOrd(o.val[i]);
            }
        }
        return o;
    }
    parseCoord(o) {
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
    stringifyCoord(o) {
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
        if (!coordJson)
            return false;
        let coord;
        try {
            coord = JSON.parse(coordJson);
        }
        catch (e) {
            return false;
        }
        let precoord;
        [this.handle.range, precoord] = coord;
        this.handle.coord = this.parseCoord(precoord);
        this.handle.draw();
    }
}
//# sourceMappingURL=save.js.map