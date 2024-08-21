import { adds, BOCF, BOCFNode, clone, cmp, muls, os, pows, pred, psis, stringify } from "./bocf.js";
import { addv, mulv } from "./veblen.js";

export function bocf2mocf(bocf: BOCF, order?: BOCF): BOCF {
    const order_succ = isFinite(order as number) ? (order as number) + 1 : order;
    if (cmp(bocf, psis(os(order_succ))) === -1) return bocf;
    // if (cmp(bocf, psis(os(order_succ))) === 0) return psim(0,order);
    const o = bocf as BOCFNode;
    if (o.op === "+") {
        return adds(...o.val.map(e => bocf2mocf(e, order)));
    }
    if (o.op === "*") {
        return muls(...o.val.map(e => bocf2mocf(e, order)));
    }
    if (o.op === "^") {
        return pows(...o.val.map(e => bocf2mocf(e, order)));
    }
    if (o.op === "p") {
        const order = o.val[1];
        const o1 = (bocf as BOCFNode).val[0] as BOCFNode;
        if (o1.op === "+") {
            let idx = o1.val.findIndex(e => (cmp(e, os(isFinite(order as number) ? (order as number) + 1 : order)) === -1));
            // psi_n(. + (a<O_n_1)) = psi_n(.)w^a
            if (idx !== -1) return mulv(bocf2mocf(psim(adds(...o1.val.slice(0, idx)), order)), powm(Infinity, bocf2mocf(adds(...o1.val.slice(idx)))));
            const om = clone(o1);
            const terms = [];
            idx = o1.val.length - 1
            while (idx >= 0) {
                let state = null as BOCFNode;
                for (; idx >= 0; idx--) {
                    const e = o1.val[idx] as BOCFNode;
                    if (state) {
                        // O = O*1
                        if (state.op !== "*") state = { op: "*", val: [state, 1] };
                        // O^a a + O^a b
                        if (e.op === "*" && cmp(e.val[0], state.val[0]) === 0) {
                            state = mulv(e.val[0], addv(mulv(...e.val.slice(1)), mulv(...state.val.slice(1)))) as BOCFNode;
                            continue;
                        } else {
                            break;
                        }
                    }
                    state = e;
                }
                if (state.op === "*") terms.unshift(mulv(...state.val)); //avoid (#*1)
                else terms.unshift(state);
            }
            const dealed = [];
            for (let i = 0; i < terms.length; i++) {
                const t = terms[i];
                dealed.push(dealterm(t, order, !i ? true : false, dealed));
            }
            return psim(addv(...dealed), order);
        } else {
            return psim(dealterm(clone(o1), order, true), order);
        }
    }
    if (o.op === "o") return os(bocf2mocf(o.val[0]));
    return bocf;
}
function dealterm(o: BOCFNode, order: BOCF, minusOne: boolean, prevTerms?: BOCF[]) {
    if (o.op === "o") {
        const pre = isFinite(o.val[0] as number) ? (o.val[0] as number) - 1 : o.val[0];
        // O=>0 || +O => +1
        if (!isFinite(o.val[0] as number)) return os(bocf2mocf(o.val[0]));
        if (pre !== -1 && cmp(pre, (order as number)) === 0) return minusOne ? 0 : 1;
        // O_n=>O_n
        if (!minusOne) {
            // (#+O_2) => #+P_1(#+1)
            return psim(addv(...prevTerms, 1), isFinite(o.val[0] as number) ? (o.val[0] as number) - 1 : o.val[0]);
        }
        return psim(0, isFinite(o.val[0] as number) ? (o.val[0] as number) - 1 : o.val[0]);
    }
    // if (cmp(o, os()) === 0) return minusOne ? 0 : 1;
    if (o.op === "*") {
        const first = o.val[0] as BOCFNode;
        if (first.op === "o") {
            const pre = isFinite(first.val[0] as number) ? (first.val[0] as number) - 1 : first.val[0];
            if (!isFinite(first.val[0] as number)) return muls(os(bocf2mocf(first.val[0])),...o.val.slice(1));
            const noPsi = pre !== -1 && cmp(pre, order) === 0;
            // On=>n-1
            // O_2 n=>p_1(n-1)
            const val = bocf2mocf(muls(...o.val.slice(1)));
            if (!minusOne && first.val[0] !== 1) {// (#+O_2*k) => #+P_1(O_2+k)
                return psim(addv(...prevTerms, val), pre as BOCF);
            }
            if (isFinite(o.val[1] as number)) {

                const val = (o.val[1] as number) - (minusOne ? 1 : 0);
                return noPsi ? val : psim(val, pre as BOCF);
            }
            // Ow=>w
            // Op(O)=>p(0)

            return noPsi ? val : psim(val, pre as BOCF);

        } else {
            return muls(dealterm(o.val[0] as BOCFNode, 0, minusOne), ...o.val.slice(1).map(e => bocf2mocf(e)));
        }
    }
    if (o.op === "^" && (o.val[0] as BOCFNode).op === "o") {
        // O^n=>O^(n-1)
        if (isFinite(o.val[1] as number)) return powm(o.val[0], (o.val[1] as number) - 1);
        return bocf2mocf(o);
    }
    if (o.op === "p") {
        // p_1(O_2) => p_1(0)
        return bocf2mocf(o, order);
        // return psim(dealterm(o.val[0] as BOCFNode, o.val[1], true), o.val[1]);
    }
    // return 4;
}
export function powm(...val: BOCF[]): BOCF {
    let [u, v] = val;
    if (u === 0) return 0;
    if (u === 1) return 1;
    if (v === 0) return 1;
    if (v === 1) return u;
    if (u === Infinity) {
        if ((v as BOCFNode).op === "p") return v;
        if ((v as BOCFNode).op === "o") return v;
        const w = v as BOCFNode;
        if (w.op === "+") {
            const first = w.val[0];
            // u^(v1+v2) = u^v1 u^v2
            return mulv(powm(u, first), powm(u, addv(...w.val.slice(1))));
        }
        if (w.op === "*") {
            const first = w.val[0];
            // u^(v1*v2) = (u^v1)^v2
            return powm(powm(u, first), mulv(...w.val.slice(1)));
        }
        if (w.op === "^") {
            // w^ (a^n) = w^(a*a^(n-1))= (w^a)^(a^(n-1))
            if (typeof w.val[1] === "number") {
                return powm(powm(u, w.val[0]), powm(w.val[0], w.val[1] - 1));
            }
            // u^(v1^v2) = (u^v1)^v2
            return powm(powm(u, w.val[0]), w);
        }
    }
    // (a^b)^c = a^(b*c)
    const w = u as BOCFNode;
    if (w.op === "^") {
        return { op: "^", val: [w.val[0], mulv(w.val[1], v)] };
    }
    return { op: "^", val };
}
export function psim(val: BOCF, ord: BOCF = 0): BOCFNode {
    // if ((val as BOCFNode)?.op === "o") {
    //     const res = cmp(ord, (val as BOCFNode).val[0]);
    //     if (res === 1) {
    //         return mulv(os(ord), val) as BOCFNode;
    //     }
    //     if (res === 0) {
    //         return powm(os(ord), 2) as BOCFNode;
    //     }
    // }
    return { op: "p", val: [val, ord] };
}