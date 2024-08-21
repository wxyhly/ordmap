import { bocf2mocf } from "./mocf.js";
import { bocf2veblen } from "./veblen.js";
import { expand0Y } from "./yseq.js";
// import { yseq2bocf } from "./yseq2ocf.js";

export type BOCFNode = { op: string, val: BOCF[] };
export type BOCF = BOCFNode | number;
export function printVal(bocf: BOCF, mode?: string): string {
    return (
        mode === "mocf" ? stringify(bocf2mocf(bocf)) : mode === "veblen" ? stringify(bocf2veblen(bocf)) : stringify(bocf)
    ).replaceAll("Ψ_{0}", "Ψ").replaceAll("Ω_{1}", "Ω").replaceAll("_{0}", "₀").replaceAll("_{1}", "₁").replaceAll("_{2}", "₂").replaceAll("_{3}", "₃").replaceAll("_{4}", "₄").replaceAll("_{5}", "₅").replaceAll("^{2}", "²").replaceAll("^{3}", "³").replaceAll("^{4}", "⁴").replaceAll("^{5}", "⁵").replaceAll(/\{(.)\}/g, "$1").replaceAll(/([^0-9])\*/g, "$1");
}
export function stringify(bocf: BOCF): string {
    if (bocf === Infinity) return "ω";
    if (typeof bocf === "number") return bocf.toString();
    if (bocf.op === "0Y") return "Y(" + bocf.val.join(",") + ")";
    if (bocf.op === "i") return "EBO";
    if (bocf.op === "+") return bocf.val.map(v => stringify(v)).join("+");
    if (bocf.op === "*") return bocf.val.map(v => (v as BOCFNode).op === "+" ? "(" + stringify(v) + ")" : stringify(v)).join("*");
    if (bocf.op === "^") {
        const bracket = (bocf.val[0] as BOCFNode).op === "*" || (bocf.val[0] as BOCFNode).op === "_";
        return (bracket ? "(" : "") + stringify(bocf.val[0]) + (bracket ? ")" : "") + "^{" + stringify(bocf.val[1]) + "}";
    }
    if (bocf.op === "p") return "Ψ_{" + stringify(bocf.val[1]) + "}(" + stringify(bocf.val[0]) + ")";
    if (bocf.op === "o") return "Ω_{" + stringify(bocf.val[0]) + "}";
    if (bocf.op === "#") return "#"; // dbg only
    // veblens
    if (bocf.op === "v") {
        // [0,0,1] is phi(1,0,0)
        if (bocf.val.length === 2 && bocf.val[1] === 1) {
            return "ε_{" + stringify(bocf.val[0]) + "}";
        }
        return "φ(" + bocf.val.map(v => stringify(v)).reverse().join(",") + ")";
    }
    if (bocf.op === "v@" || bocf.op === "@") {
        // [1,w, 2,3, 3,2, 3,0] is phi(1@w,2,3,0,3)
        let maps = [];
        let i = 0
        for (; i < bocf.val.length; i += 2) {
            if (isFinite(bocf.val[i + 1] as number)) break;
            maps.push(stringify(bocf.val[i]) + (bocf.val[i + 1] ? "@" + stringify(bocf.val[i + 1]) : ""));
        }
        if (i < bocf.val.length) {
            const keys = new Array(bocf.val[i + 1] as number + 1);
            for (; i < bocf.val.length; i += 2) {
                keys[bocf.val[i + 1] as number] = stringify(bocf.val[i]);
            }
            for (let i = 0; i < keys.length; i++) {
                keys[i] ??= 0;
            }
            maps = maps.concat(keys.reverse());
        }
        return (bocf.op === "@" ? "" : "φ") + "(" + maps.join(",") + ")";
    }
}
// pred lim = null; pred O = false
export function pred(bocf: BOCF): BOCF | null | false {
    if (bocf === Infinity || bocf === 0) return null;
    if (typeof bocf === "number") return bocf - 1;
    if (bocf.op === "o") return false;
    if (bocf.op === "+") {
        const res = pred(bocf.val[bocf.val.length - 1]);
        if (res === null || res === false) return res;
        return adds(...bocf.val.slice(0, bocf.val.length - 1), res);
    }
    return null;
}
export function expand(bocf: BOCF, n: number): BOCF | null | false {
    if (bocf === Infinity) return n;
    if (typeof bocf === "number") return null;
    if (bocf.op === "0Y") {
        const val = expand0Y(bocf.val as number[], n); if (!val) return null;
        return { op: "0Y", val };
    }
    if (bocf.op === "+") {
        const res = expand(bocf.val[bocf.val.length - 1], n);
        if (res === null || res === false) return res;
        return adds(...bocf.val.slice(0, bocf.val.length - 1), res);
    }
    if (bocf.op === "*") {
        const mulval = bocf.val[bocf.val.length - 1];
        const res = expand(mulval, n);
        const valsmul = bocf.val.slice(0, bocf.val.length - 1);
        if (res === false) return false;
        if (res !== null) return muls(...valsmul, res);
        const pre = pred(mulval)!;
        if (pre === false) return false;
        if (pre === null) return null;
        return expand(adds(muls(...valsmul, pre), muls(...valsmul)), n);
    }
    if (bocf.op === "^") {
        const mulval = bocf.val[1];
        const res = expand(mulval, n);
        const valsmul = bocf.val[0];
        if (res === false) return false;
        if (res !== null) return pows(valsmul, res);
        const pre = pred(mulval)!;
        if (pre === null) return null;
        if (pre === false) return false;
        return expand(muls(pows(valsmul, pre), valsmul), n);
    }
    if (bocf.op === "o") {
        const lim = expand(bocf.val[0], n);
        if (lim !== null && lim !== false) {
            if (lim === 0) return 0;
            return os(lim);
        }
        return false;
    }
    if (bocf.op === "p") {
        const O = bocf.val[0];
        const idx = bocf.val[1];
        if (typeof O === "number") return expand(pows(Infinity, O), n);
        const res = expand(O, n);
        // if O is lim ord
        if (res !== null && res !== false) return psis(res, idx);
        // if O is succ ord
        const pre = pred(O);
        if (pre !== null && pre !== false) return muls(psis(pre, idx), n);
        // O is nonit
        if (O.op === "o") {
            const subidx = O.val[0];
            const predIdx = pred(subidx);
            // p(O_{a+1}) = p(O_a^O_a^O_a^..)
            if (predIdx !== null && predIdx !== false) {
                const base = os(predIdx);
                let jeg: BOCF = base;
                for (let i = 0; i < n; i++) {
                    jeg = pows(base, jeg);
                }
                return cmp(predIdx, idx) === 0 ? jeg : psis(jeg, idx);
            }
        }
        // O^O^O+O^2 => O^O^O+O*X
        let template = findFixpoint(O) as BOCFNode;
        if (cmp(_fixPointCache, idx) === -1) {
            return null; // can't expand p_1(#+O) in this layer
        }
        let val = n ? clone(template as BOCFNode) : template;
        template = psis(template, _fixPointCache);
        for (let i = 1; i < n + 1; i++) {
            replaceFixPoint(val, template);
        }
        val = removeFixPoint(val);
        return psis(val, idx);
    }
    if (bocf.op === "i") {
        let res = os();
        for (let i = 0; i < n; i++) {
            res = os(res);
        }
        return psis(res);
    }
}
export function clone(exp: BOCFNode): BOCFNode {
    return { op: exp.op, val: exp.val.map(e => (typeof e === "number" ? e : clone(e))) };
}
// x+$=>x  x*$=>x  x^$=>x
function removeFixPoint(exp: BOCFNode) {
    if (exp.op === "p") return psis(removeFixPoint(exp.val[0] as BOCFNode), exp.val[1]);
    const inner = exp.val[exp.val.length - 1];
    if (typeof inner === "number") return exp;
    const remained = exp.val.slice(0, exp.val.length - 1);
    if (exp.op === "+" && inner.op === "#") {
        return adds(...remained);
    }
    if (exp.op === "*" && inner.op === "#") {
        return muls(...remained);
    }
    if (exp.op === "^" && inner.op === "#") {
        return remained[0];
    }
    if (exp.op === "o" && inner.op === "#") {
        return os();
    }
    if (exp.op === "+") {
        return adds(...remained, removeFixPoint(inner));
    }
    if (exp.op === "*") {
        return muls(...remained, removeFixPoint(inner));
    }
    if (exp.op === "^") {
        return pows(...remained, removeFixPoint(inner));
    }
    if (exp.op === "o") {
        return os(removeFixPoint(inner));
    }
}
function replaceFixPoint(exp: BOCFNode, val: BOCFNode) {
    if (exp.op === "#") {
        exp.op = val.op;
        exp.val = val.val.map(e => (typeof e === "number" ? e : clone(e)));
        return;
    }
    for (const e of exp.val) {
        if (typeof e !== "number") replaceFixPoint(e, val);
    }
}
let _fixPointCache = null;
function findFixpoint(O: BOCFNode): BOCF {
    // hyp: O is nonit
    const inner = O.val[O.val.length - 1];
    const remained = O.val.slice(0, O.val.length - 1);
    if (O.op === "o") {
        const pre = pred(O.val[0]);
        if (pre !== null && pre !== false) {
            _fixPointCache = pre;
            return { op: "#", val: [O.val[0]] };
        } else {
            return os(findFixpoint(O.val[0] as BOCFNode));
        }
    }
    // if O = a + b is nonit, then b is nonit
    if (O.op === "+") return adds(...remained, findFixpoint(inner as BOCFNode));
    // if O = a * b is nonit, then b is succ or nonit
    const pre = pred(inner);
    if (O.op === "*") {
        if (pre !== null && pre !== false) {
            return findFixpoint(adds(muls(...remained, pre), muls(...remained)) as BOCFNode);
        }
        return muls(...remained, findFixpoint(inner as BOCFNode));
    }
    if (O.op === "^") {
        if (pre !== null && pre !== false) {
            return findFixpoint(muls(pows(...remained, pre), ...remained) as BOCFNode);
        }
        return pows(...remained, findFixpoint(inner as BOCFNode));
    }
    if (O.op === "p") {
        return psis(findFixpoint(O.val[0] as BOCFNode), O.val[1]);
    }
}
export function os(val?: BOCF): BOCF {
    if (val === 0) return Infinity;
    return { op: "o", val: [val || 1] };
};
export function psis(val: BOCF, ord: BOCF = 0): BOCFNode {
    if ((val as BOCFNode)?.op === "o") {
        const res = cmp(ord, (val as BOCFNode).val[0]);
        if (res === 1) {
            // p_2(O) = O_2 O?
            return muls(os(ord), val) as BOCFNode;
        }
        if (res === 0) {
            // p_1(O) = O_1^2?
            return pows(os(ord), 2) as BOCFNode;
        }
    }
    if (ord === 0 && cmp(val, os()) === -1) return pows(Infinity, val) as BOCFNode;
    if (cmp(val, os(ord)) === -1) return 0 as any;
    return { op: "p", val: [val, ord] };
}
export function pows(...val: BOCF[]): BOCF {
    let [u, v] = val;
    if (u === 0) return 0;
    if (u === 1) return 1;
    if (v === 0) return 1;
    if (v === 1) return u;
    return { op: "^", val };
}
export function muls(...val: BOCF[]): BOCF {
    const set = [];
    for (let v of val) {
        if (v === 0) return 0;
        if (v === 1) continue;
        set.push(v);
    }
    if (set.length === 1) return set[0];
    if (set[set.length - 1].op === "*") {
        const merge = set.pop();
        return { op: "*", val: [...set, ...merge.val] };
    }
    return { op: "*", val: set };
}
export function adds(...val: BOCF[]): BOCF {
    const set = [];
    for (let v of val) {
        if (v === 0) continue;
        set.push(v);
    }
    if (set.length === 1) return set[0];
    if (set[set.length - 1].op === "+") {
        const merge = set.pop();
        return { op: "+", val: [...set, ...merge.val] };
    }
    return { op: "+", val: set };
}
// 0 | 1 | -1   =>  a=b | a>b | a<b
export function cmp(a: BOCF, b: BOCF): 0 | 1 | -1 {
    if (typeof a === "number" && typeof b === "number") return a < b ? -1 : a === b ? 0 : 1;
    if (typeof a === "number") return -1;
    if (typeof b === "number") return 1;
    if (a.op === b.op && a.op === "0Y") {
        const l = Math.max(a.val.length, b.val.length);
        for (let i = 0; i < l; i++) {
            const ai = a.val[i] ?? 0;
            const bi = b.val[i] ?? 0;
            if (ai > bi) return 1;
            if (ai < bi) return -1;
        }
        return 0;
    }
    for (const op of "+*^") {
        if (a.op === op && b.op === op) {
            let idx = 0;
            for (const i of a.val) {
                if (!b.val[idx]) return 1;
                const res = cmp(i, b.val[idx++]);
                if (res !== 0) return res;
            }
            return (a.val.length === b.val.length) ? 0 : -1;
        }
        if (a.op === op) {
            const res = cmp(a.val[0], b);
            return res === -1 ? -1 : 1;
        }
        if (b.op === op) {
            const res = cmp(b.val[0], a);
            return res === -1 ? 1 : -1;
        }
    }
    if (a.op === "i" && b.op === "i") return 0;
    if (b.op === "i") return -1;
    if (a.op === "i") return 1;
    if (a.op === "p" && b.op === "p") {
        const res = cmp(a.val[1], b.val[1]);
        if (res !== 0) return res;
        return cmp(a.val[0], b.val[0]);
    }
    if (a.op === "p") {
        // remained b must be o
        // p_0 < o_1, o_1 < p_1(.) < o2  (ps. : .>=o2)
        const res = cmp(a.val[1], b.val[0]);
        return res === -1 ? -1 : 1;
    }
    if (b.op === "p") {
        const res = cmp(b.val[1], a.val[0]);
        return res === -1 ? 1 : -1;
    }
    // cmp o_a and o_b
    return cmp(a.val[0], b.val[0]);
}

function printValList(ord: BOCF, n: number) {
    for (let i = 0; i < n; i++) {
        const e = expand(ord, i);
        if (e === null || e === false) break;
        console.log(printVal(e));
    }
    console.log(printVal(ord));
    console.log("====");
}
function iterativeList(ord: BOCF, n: number) {
    for (let i = 0; i < 10; i++) {
        const e = expand(ord, n);
        if (e === null || e === false) break;
        console.log(printVal(e));
        ord = e;
    }
}

// printValList(psis(adds(pows(os(2),2), psis(os(2), 1))), 4);
// printValList(psis(muls(pows(os(2),2), 2)), 4);
// iterativeList(expand(psis(muls(pows(os(2),2), 2)),1)as BOCF, 1);
// printValList({"op":"+","val":[{"op":"p","val":[{"op":"*","val":[{"op":"o","val":[Infinity]},2]},0]},{"op":"p","val":[{"op":"o","val":[Infinity]},0]}]}, 4);
// printValList({ "op": "p", "val": [{ "op": "^", "val": [{ "op": "o", "val": [Infinity] }, { "op": "p", "val": [{ "op": "^", "val": [{ "op": "o", "val": [2] }, { "op": "^", "val": [{ "op": "o", "val": [1] }, { "op": "o", "val": [1] }] }] }, 1] }] }, 0] }, 4);
// iterativeList(expand(psis(muls(pows(os(1),2), 2)),1)as BOCF, 1);
// printValList(psis(adds(os(2), psis(adds(os(2), os()), 1))), 4);
// printVal(adds(psis(os()), 1));