import { BOCF, BOCFNode } from "./bocf.js";
import { Chunk, HandleCanvas } from "./draw.js";
const inf = "inf";
const initData = `[[-1742.9618440651334,2968.066914138802,198.86132276790272],[{"ord":{"op":"^","val":["inf",2]},"preOrd":0,"dens":198.86132276790272,"max":2058.6671458004253,"min":-1012.3887194944527,"preOrdDens":1.5189236895063953,"lastMax":6793.26371612853,"lastMin":-1012.3887194944529,"lastDens":204.88830887977497},{"ord":{"op":"^","val":["inf","inf"]},"preOrd":0,"dens":204.88830887977497,"max":1993.882261314965,"min":-133.40619276567213,"preOrdDens":1.4742430923961887,"lastMax":5273.48805833347,"lastMin":-133.40619276567202,"lastDens":211.0979577693413},{"ord":{"op":"p","val":[{"op":"o","val":[1]},0]},"preOrd":0,"dens":211.0979577693413,"max":3275.607911975366,"min":-3.83922514024016,"preOrdDens":1.4308768179026587,"lastMax":53843.60719722033,"lastMin":-3.8392251402399147,"lastDens":230.87908559771535},{"ord":{"op":"p","val":[{"op":"^","val":[{"op":"o","val":[1]},2]},0]},"preOrd":0,"dens":230.87908559771535,"max":48738.35167327883,"min":15.16728464042535,"preOrdDens":1.3082829624726038,"lastMax":123854.0877003606,"lastMin":15.16728464042891,"lastDens":237.87644950463888},{"ord":{"op":"p","val":[{"op":"^","val":[{"op":"o","val":[1]},"inf"]},0]},"preOrd":0,"dens":237.87644950463888,"max":112086.45408719715,"min":32.36508587624121,"preOrdDens":1.2697985643713523,"lastMax":284838.4093584353,"lastMin":32.365085876245054,"lastDens":245.0858858975529},{"ord":{"op":"p","val":[{"op":"^","val":[{"op":"o","val":[1]},{"op":"p","val":[{"op":"o","val":[1]},0]}]},0]},"preOrd":0,"dens":245.0858858975529,"max":211064.25407060634,"min":74.74711321058567,"preOrdDens":1.2324462217502212,"lastMax":536343.3241469777,"lastMin":74.74711321057336,"lastDens":252.51382215967092},{"ord":{"op":"p","val":[{"op":"^","val":[{"op":"o","val":[1]},{"op":"o","val":[1]}]},0]},"preOrd":0,"dens":252.51382215967092,"max":325385.74594830076,"min":122.41213685489492,"preOrdDens":1.196192634111521,"lastMax":826838.9048179099,"lastMin":122.41213685491209,"lastDens":260.1668804720124},{"ord":{"op":"p","val":[{"op":"o","val":[2]},0]},"preOrd":0,"dens":260.1668804720124,"max":410694.6613761963,"min":159.40070880629355,"preOrdDens":1.1610054805236392,"lastMax":1043610.1544220861,"lastMin":159.40070880628681,"lastDens":268.05188371723386},{"ord":{"op":"p","val":[{"op":"o","val":["inf"]},0]},"preOrd":0,"dens":268.05188371723386,"max":469032.1391950338,"min":179.4929217120516,"preOrdDens":1.1268533908061653,"lastMax":1191854.5912775788,"lastMin":179.49292171206812,"lastDens":276.1758615623904},{"ord":{"op":"p","val":[{"op":"o","val":[{"op":"p","val":[{"op":"o","val":[1]},0]}]},0]},"preOrd":0,"dens":276.1758615623904,"max":535642.6584434523,"min":188.52093492285348,"preOrdDens":1.093705917562633,"lastMax":1361143.5396436239,"lastMin":188.52093492285138,"lastDens":284.5460567260502},{"ord":{"op":"p","val":[{"op":"o","val":[{"op":"o","val":[1]}]},0]},"preOrd":0,"dens":284.5460567260502,"max":611709.0860817163,"min":192.57731520198286,"preOrdDens":1.0615335090359443,"lastMax":1554474.0803052764,"lastMin":192.57731520201168,"lastDens":293.1699314353495},{"ord":{"op":"p","val":[{"op":"o","val":[{"op":"o","val":[{"op":"o","val":[1]}]}]},0]},"preOrd":0,"dens":293.1699314353495,"max":571982.2377871415,"min":194.02704404375982,"preOrdDens":1.0303074827622791,"lastMax":1453498.7650934183,"lastMin":194.0270440437576,"lastDens":302.0551740787449},{"ord":{"op":"i","val":[]},"preOrd":0,"dens":1,"max":1,"min":0,"preOrdDens":1}]]`;
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
        const coordJson = localStorage.getItem(this.storageKey) ?? initData;
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