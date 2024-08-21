import { adds, clone, cmp, muls, os, pows, psis } from "./bocf.js";
const pO = psis(os());
const pOxx3 = psis(pows(os(), pows(os(), pows(os(), os()))));
const e0 = { op: "v", val: [0, 1] };
export function bocf2veblen(bocf) {
    let cm = cmp(bocf, pO);
    if (cm === 0)
        return e0;
    if (cm === -1)
        return bocf;
    if (bocf.op === "i")
        return bocf;
    if ("+*^".includes(bocf.op)) {
        const c = clone(bocf);
        c.val = c.val.map(e => bocf2veblen(e));
        return c;
    }
    cm = cmp(bocf, pOxx3);
    const o = bocf.val[0];
    const res = firstTermB2V(o);
    if (res)
        return res;
    if (cm === -1) {
        if (o.op === "+") {
            let idx = o.val.findIndex(e => (cmp(e, os()) === -1));
            // psi(. + (a<O)) = psi(.)w^a
            if (idx !== -1)
                return mulv(bocf2veblen(psis(adds(...o.val.slice(0, idx)))), powv(Infinity, bocf2veblen(adds(...o.val.slice(idx)))));
            let state = null;
            for (idx = o.val.length - 1; idx >= 0; idx--) {
                const e = o.val[idx];
                if (state) {
                    // O = O*1
                    if (state.op !== "*")
                        state = { op: "*", val: [state, 1] };
                    // O^a a + O^a b
                    if (e.op === "*" && cmp(e.val[0], state.val[0]) === 0) {
                        state = mulv(e.val[0], addv(mulv(...e.val.slice(1)), mulv(...state.val.slice(1))));
                        continue;
                    }
                    else {
                        break;
                    }
                }
                state = e;
            }
            // all same e.g. p(O^aw2+O^aw+O^a)
            if (idx === -1)
                return firstTermB2V(state);
            let leftPartbocf = psis(adds(...o.val.slice(0, idx + 1)));
            let leftPart = bocf2veblen(leftPartbocf);
            let coeff = mulv(...state.val.slice(1));
            const powerPart = state.val[0];
            let power = cmp(powerPart, os()) === 0 ? 1 : (powerPart.op === "^" && cmp(powerPart.val[0], os()) === 0) ? powerPart.val[1] : null;
            if (power) {
                if (cmp(power, os()) === -1) {
                    power = bocf2veblen(power);
                    const res = cmpv(leftPart, power);
                    // if a < p(.),  p(. + O^a*b) = phi(b,p(.)+a)
                    if (res === 1)
                        return { op: "v", val: [addv(leftPart, bocf2veblen(coeff)), power] };
                    // if a > p(.),  p(. + O^a*b) = phi(b,a-1)
                    if (res === -1 && typeof coeff === "number")
                        coeff--;
                    // if a = p(.),  p(. + O^a*b) = phi(b,a)
                    return { op: "v", val: [bocf2veblen(coeff), power] };
                }
                let cmpres = -1;
                if (power.op === "*") {
                    const powerCoeff = muls(...power.val.slice(1));
                    if (cmp(powerCoeff, os()) === -1)
                        cmpres = cmp(powerCoeff, leftPartbocf);
                }
                let res = firstTermB2V(state);
                if (!res)
                    return bocf;
                // res = { op: "v", val: res.val.slice(0) };
                const val0 = vget(res, 0);
                if (cmpres === -1)
                    res = vset(res, 0, addv(addv(leftPart, val0), isFinite(coeff) ? 1 : 0));
                if (cmpres === 0)
                    res = vset(res, 0, addv(val0, isFinite(coeff) ? 1 : 0));
                if (cmpres === 1)
                    res = vset(res, 0, addv(val0));
                return res;
            }
        }
    }
    return bocf;
}
export function firstTermB2V(o) {
    if (o.op === "*") {
        let res = firstTermB2V(o.val[0]);
        if (!res)
            return;
        let coeff = mulv(...o.val.slice(1));
        if (typeof coeff === "number")
            coeff--;
        res = vset(res, 0, bocf2veblen(coeff));
        return res;
    }
    // psi(O) = e_0
    if (cmp(o, os()) === 0)
        return e0;
    // psi(O^a) = phi(a,0)
    if (o.op === "^" && cmp(o.val[0], os()) === 0 && cmp(o.val[1], os()) === -1) {
        const res = o.val[1];
        return { op: "v", val: [0, bocf2veblen(res)] };
    }
    if (o.op === "^" && cmp(o.val[0], os()) === 0) {
        // psi(O^O) = phi(1,0,0)
        if (cmp(o.val[1], os()) === 0) {
            return { op: "v", val: [0, 0, 1] };
        }
        const o1 = o.val[1];
        // psi(O^{O^a}) = phi(1@a+1)
        if (o1.op === "^" && cmp(o1.val[0], os()) === 0) {
            if (cmp(o1.val[1], os()) === -1) {
                if (isFinite(o1.val[1])) {
                    const res = { op: "v", val: new Array(o1.val[1] + 1).fill(0) };
                    res.val.push(1);
                    return res;
                }
                else {
                    const res = { op: "v@", val: [1, bocf2veblen(o1.val[1])] };
                    return res;
                }
            }
            else {
                // psi(O^{O^(O...)}) = phi(1@(..,..)))
                return { op: "v@", val: [1, bocfPow2VeblenMD(o1.val[1])] };
            }
        }
        // psi(O^{Ob}) = phi(b,0,0)
        if (o1.op === "*" && cmp(o1.val[1], os()) === -1 && cmp(o1.val[0], os()) === 0) {
            return { op: "v", val: [0, 0, bocf2veblen(muls(...o1.val.slice(1)))] };
        }
        const o2 = o1.val[0];
        if (o1.op === "*" && o2?.op === "^" && cmp(o2.val[0], os()) === 0) {
            // psi(O^{O^a*b}) = phi(b@a+1)
            if (cmp(o2.val[1], os()) === -1) {
                if (isFinite(o2.val[1])) {
                    const res = { op: "v", val: new Array(o2.val[1] + 1).fill(0) };
                    res.val.push(bocf2veblen(muls(...o1.val.slice(1))));
                    return res;
                }
                else {
                    const res = { op: "v@", val: [bocf2veblen(muls(...o1.val.slice(1))), bocf2veblen(o2.val[1])] };
                    return res;
                }
            }
            else {
                // psi(O^{O^(O...)*b}) = phi(b@(..,..)))
                return { op: "v@", val: [bocf2veblen(muls(...o1.val.slice(1))), bocfPow2VeblenMD(o2.val[1])] };
            }
        }
        // psi(O^{O^a*b+c}) = phi(1,0,0)
        if (o1.op === "+") {
            let idx = o1.val.findIndex(e => (cmp(e, os()) === -1));
            // psi(O^(. + (a<O)) = phi(...,a,0)
            if (idx !== -1) {
                let left = firstTermB2V(pows(os(), adds(...o1.val.slice(0, idx))));
                left = vset(left, 1, bocf2veblen(adds(...o1.val.slice(idx))));
                // left = { op: "v", val: left.val.slice(0) };
                // left.val[1] = bocf2veblen(adds(...o1.val.slice(idx)));
                return left;
            }
            let state = null;
            for (idx = o1.val.length - 1; idx >= 0; idx--) {
                const e = o1.val[idx];
                if (state) {
                    // O = O*1
                    if (state.op !== "*")
                        state = { op: "*", val: [state, 1] };
                    // O^a a + O^a b
                    if (e.op === "*" && cmp(e.val[0], state.val[0]) === 0) {
                        state = mulv(e.val[0], addv(mulv(...e.val.slice(1)), mulv(...state.val.slice(1))));
                        continue;
                    }
                    else {
                        break;
                    }
                }
                state = e;
            }
            // all same e.g. p(O^aw2+O^aw+O^a)
            if (idx === -1)
                return firstTermB2V(pows(os(), state));
            // p(O^(.+O^a*b)) = phi(., .+b@a+1, .)
            let leftPart = firstTermB2V(pows(os(), adds(...o1.val.slice(0, idx + 1))));
            let coeff = mulv(...state.val.slice(1));
            const powerPart = state.val[0];
            let power = cmp(powerPart, os()) === 0 ? 1 : (powerPart.op === "^" && cmp(powerPart.val[0], os()) === 0) ? powerPart.val[1] : null;
            if (!power)
                return;
            const powres = cmp(power, os());
            if (powres === -1) {
                power = bocf2veblen(power);
                if (isFinite(power)) {
                    return vset(leftPart, power + 1, bocf2veblen(coeff));
                }
                else {
                    return vset(leftPart, power, bocf2veblen(coeff));
                }
            }
            else if (powres === 0) {
                power = { op: "@", val: [1, 1] };
                return vset(leftPart, power, bocf2veblen(coeff));
            }
            else {
                power = bocfPow2VeblenMD(power);
                return vset(leftPart, power, bocf2veblen(coeff));
            }
        }
    }
    return;
}
function bocfPow2VeblenMD(o1) {
    if (o1.op === "*") {
        const res = bocfPow2VeblenMD(o1.val[0]);
        res.val[0] = bocf2veblen(muls(...o1.val.slice(1)));
        return res;
    }
    // O = @(1,0)
    if (cmp(o1, os()) === 0)
        return { op: "@", val: [1, 1] };
    // O^k = @(1,0)
    if (o1.op === "^" && cmp(o1.val[0], os()) === 0) {
        if (cmp(o1.val[1], os()) === -1)
            return { op: "@", val: [1, bocf2veblen(o1.val[1])] };
        return { op: "@", val: [1, bocfPow2VeblenMD(o1.val[1])] };
    }
    if (o1.op === "+") {
        let idx = o1.val.findIndex(e => (cmp(e, os()) === -1));
        // . + (a<O) = @(..,a)
        if (idx !== -1) {
            let left = bocfPow2VeblenMD(adds(...o1.val.slice(0, idx)));
            left = vset(left, 0, bocf2veblen(adds(...o1.val.slice(idx))));
            return left;
        }
        let state = null;
        for (idx = o1.val.length - 1; idx >= 0; idx--) {
            const e = o1.val[idx];
            if (state) {
                // O = O*1
                if (state.op !== "*")
                    state = { op: "*", val: [state, 1] };
                // O^a a + O^a b
                if (e.op === "*" && cmp(e.val[0], state.val[0]) === 0) {
                    state = mulv(e.val[0], addv(mulv(...e.val.slice(1)), mulv(...state.val.slice(1))));
                    continue;
                }
                else {
                    break;
                }
            }
            state = e;
        }
        // all same e.g. O^aw2+O^aw+O^a = O^a(w2+w+1) @(w2+w+1@a)
        let coeff = mulv(...state.val.slice(1));
        if (idx === -1) {
            const res = bocfPow2VeblenMD(state.val[0]);
            res.val[0] = bocf2veblen(coeff);
            return res;
        }
        // .+O^a*b = @(., .+b@a+1, .)
        let leftPart = bocfPow2VeblenMD(adds(...o1.val.slice(0, idx + 1)));
        const powerPart = state.val[0];
        let power = cmp(powerPart, os()) === 0 ? 1 : (powerPart.op === "^" && cmp(powerPart.val[0], os()) === 0) ? powerPart.val[1] : null;
        if (!power)
            return;
        const powres = cmp(power, os());
        if (powres === -1) {
            power = bocf2veblen(power);
            return vset(leftPart, power, bocf2veblen(coeff));
        }
        else if (powres === 0) {
            power = { op: "@", val: [1, 1] };
            return vset(leftPart, power, bocf2veblen(coeff));
        }
        else {
            power = bocfPow2VeblenMD(power);
            return vset(leftPart, power, bocf2veblen(coeff));
        }
    }
}
export function cmpv(a, b) {
    if (typeof a === "number" && typeof b === "number")
        return a < b ? -1 : a === b ? 0 : 1;
    if (typeof a === "number")
        return -1;
    if (typeof b === "number")
        return 1;
    for (const op of "+*^") {
        if (a.op === op && b.op === op) {
            let idx = 0;
            for (const i of a.val) {
                if (!b.val[idx])
                    return 1;
                const res = cmp(i, b.val[idx++]);
                if (res !== 0)
                    return res;
            }
            return (a.val.length === b.val.length) ? 0 : -1;
        }
        if (a.op === op) {
            const res = cmpv(a.val[0], b);
            return res === -1 ? -1 : 1;
        }
        if (b.op === op) {
            const res = cmpv(b.val[0], a);
            return res === -1 ? 1 : -1;
        }
    }
    if (a.op === "i" && b.op === "i")
        return 0;
    if (b.op === "i")
        return -1;
    if (a.op === "i")
        return 1;
    if (a.op === "p" && b.op === "p") {
        const res = cmp(a.val[1], b.val[1]);
        if (res !== 0)
            return res;
        return cmp(a.val[0], b.val[0]);
    }
    if (a.op === "p") {
        // remained b must be o
        // p_0 < o_1, o_1 < p_1(.) < o2  (ps. : .>=o2)
        const res = cmpv(a.val[1], b.val[0]);
        return res === -1 ? -1 : 1;
    }
    if (b.op === "p") {
        const res = cmpv(b.val[1], a.val[0]);
        return res === -1 ? 1 : -1;
    }
    // cmp o_a and o_b
    if (a.op === "o" && b.op === "o")
        return cmp(a.val[0], b.val[0]);
    if (b.op === "o")
        return -1;
    if (a.op === "o")
        return 1;
    if (a.op === "@" && b.op === "@") {
        a.op = "v@";
        b.op = "v@";
        const res = cmpv(a, b);
        a.op = "@";
        b.op = "@";
        return res;
    }
    if (a.op === "@")
        return 1;
    if (b.op === "@")
        return -1;
    if (a.op === "v" && b.op === "v@")
        return cmpv(v2vAt(a), b);
    if (a.op === "v@" && b.op === "v")
        return cmpv(a, v2vAt(b));
    if (a.op === "v@" && b.op === "v@") {
        // step 1
        let ai = 0, bi = 0, res;
        for (let i = 0; true; i += 2) {
            let ax = a.val[i + 1];
            const bx = b.val[i + 1] ?? ax;
            ax ??= bx;
            if (ax !== 0 && bx !== 0 && !ax && !bx)
                return 0;
            // if (ai === bi && ai === a.) return cmpv(va, vb);
            const resx = cmpv(ax, bx);
            if (resx !== 0) {
                // 1@w2 > 2@w+1
                res = resx;
                ai = (resx === 1) ? i : i - 2;
                bi = (resx === -1) ? i : i - 2;
                break;
            }
            const va = a.val[i] ?? 0;
            const vb = b.val[i] ?? 0;
            res = cmpv(va, vb);
            // 1@w2 < 2@w2
            if (res !== 0) {
                ai = i;
                bi = i;
                break;
            }
        }
        // step 2
        if (res === -1) {
            for (ai += 2; true; ai += 2) {
                const va = a.val[ai] ?? 0;
                const res = cmpv(va, b);
                if (res === 1)
                    return 1;
                if (res === 0)
                    break;
                if (ai >= a.val.length)
                    return -1;
            }
            // step 3
            for (ai += 2; true; ai += 2) {
                const va = a.val[ai] ?? 0;
                const res = cmpv(va, 0);
                if (res === 1)
                    return 1;
                if (ai >= a.val.length)
                    return 0;
            }
        }
        else {
            for (bi += 2; true; bi += 2) {
                const vb = b.val[bi] ?? 0;
                const res = cmpv(vb, a);
                if (res === 1)
                    return -1;
                if (res === 0)
                    break;
                if (bi >= b.val.length)
                    return 1;
            }
            // step 3
            for (bi += 2; true; bi += 2) {
                const vb = b.val[bi] ?? 0;
                const res = cmpv(vb, 0);
                if (res === 1)
                    return -1;
                if (bi >= b.val.length)
                    return 0;
            }
        }
    }
    if (a.op === "v@") {
        return 1;
    }
    if (b.op === "v@") {
        return -1;
    }
    if (a.op === "v" && b.op === "v") {
        const la = a.val.length;
        const lb = b.val.length;
        const len = Math.max(la, lb);
        // step 1
        let i, res;
        for (i = len - 1; i >= 0; i--) {
            const va = a.val[i] ?? 0;
            const vb = b.val[i] ?? 0;
            if (i === 0)
                return cmpv(va, vb);
            res = cmpv(va, vb);
            if (res !== 0) {
                break;
            }
        }
        // step 2
        if (res === -1) {
            for (i--; i >= 0; i--) {
                const va = a.val[i] ?? 0;
                const res = cmpv(va, b);
                if (res === 1)
                    return 1;
                if (res === 0)
                    break;
                if (i === 0)
                    return -1;
            }
            // step 3
            for (i--; i >= 0; i--) {
                const va = a.val[i] ?? 0;
                const res = cmpv(va, 0);
                if (res === 1)
                    return 1;
                if (i === 0)
                    return 0;
            }
        }
        else {
            for (i--; i >= 0; i--) {
                const vb = b.val[i] ?? 0;
                const res = cmpv(vb, a);
                if (res === 1)
                    return -1;
                if (res === 0)
                    break;
                if (i === 0)
                    return 1;
            }
            // step 3
            for (i--; i >= 0; i--) {
                const vb = b.val[i] ?? 0;
                const res = cmpv(vb, 0);
                if (res === 1)
                    return -1;
                if (i === 0)
                    return 0;
            }
        }
    }
    if (a.op === "v") {
        return 1;
    }
    if (b.op === "v") {
        return -1;
    }
    // cmp o_a and o_b
    return cmpv(a.val[0], b.val[0]);
}
export function powv(...val) {
    let [u, v] = val;
    if (u === 0)
        return 0;
    if (u === 1)
        return 1;
    if (v === 0)
        return 1;
    if (v === 1)
        return u;
    if (u === Infinity && cmpv(v, e0) !== -1) {
        if (v.op[0] === "v")
            return v;
        const w = v;
        if (w.op === "+") {
            const first = w.val[0];
            // u^(v1+v2) = u^v1 u^v2
            return mulv(powv(u, first), powv(u, addv(...w.val.slice(1))));
        }
        if (w.op === "*") {
            const first = w.val[0];
            // u^(v1*v2) = (u^v1)^v2
            return powv(powv(u, first), mulv(...w.val.slice(1)));
        }
        if (w.op === "^") {
            // w^ (a^n) = w^(a*a^(n-1))= (w^a)^(a^(n-1))
            if (typeof w.val[1] === "number") {
                return powv(powv(u, w.val[0]), powv(w.val[0], w.val[1] - 1));
            }
            // u^(v1^v2) = (u^v1)^v2
            return powv(powv(u, w.val[0]), w);
        }
    }
    // (a^b)^c = a^(b*c)
    const w = u;
    if (w.op === "^") {
        return { op: "^", val: [w.val[0], mulv(w.val[1], v)] };
    }
    return { op: "^", val };
}
export function mulv(...val) {
    let set = val;
    // a*(b*c)*d
    val = [];
    for (let i = 0; i < set.length; i++) {
        if (set[i].op === "*") {
            val.push(...set[i].val);
        }
        else {
            val.push(set[i]);
        }
    }
    for (let i = val.length - 1; i >= 1; i--) {
        const a = val[i - 1];
        const b = val[i];
        if (typeof a === "number" && isFinite(a) && typeof b === "number") {
            // 1*2
            val[i - 1] = a * b;
            val[i] = 1;
            continue;
        }
        const res = cmpv(a, b);
        if (res === 0) {
            // a*a
            val[i - 1] = powv(a, 2);
            val[i] = 1;
        }
        else if (res === -1) {
            if (b.op === "^" && cmp(a, b.val[0]) === 0) {
                // w*w^2 w*w^w
                if (typeof b.val[1] === "number") {
                    val[i - 1] = powv(a, 1 + b.val[1]);
                    val[i] = 1;
                }
                else {
                    val[i - 1] = b;
                    val[i] = 1;
                }
            }
            // todo: w^a*w^b = w^(a+b)
        }
    }
    //+0
    set = [];
    for (let v of val) {
        if (v === 0)
            return 0;
        if (v === 1)
            continue;
        set.push(v);
    }
    //[a]
    if (set.length === 1)
        return set[0];
    if (set.length === 0)
        return 1;
    return { op: "*", val: set };
}
export function addv(...val) {
    let set = val;
    // a+(b+c)+d
    val = [];
    for (let i = 0; i < set.length; i++) {
        if (set[i].op === "+") {
            val.push(...set[i].val);
        }
        else {
            val.push(set[i]);
        }
    }
    for (let i = val.length - 1; i >= 1; i--) {
        const a = val[i - 1];
        const b = val[i];
        if (typeof a === "number" && isFinite(a) && typeof b === "number") {
            // 1+2
            val[i - 1] = a + b;
            val[i] = 0;
            continue;
        }
        const res = cmpv(a, b);
        if (res === 0) {
            // a*a
            val[i - 1] = mulv(a, 2);
            val[i] = 0;
        }
        else if (res === -1) {
            if (b.op === "*" && cmp(a, b.val[0]) === 0) {
                // w+w2
                if (typeof b.val[1] === "number") {
                    val[i - 1] = mulv(a, 1 + b.val[1]);
                    val[i] = 0;
                    continue;
                }
            }
            // w+w^2
            val[i - 1] = b;
            val[i] = 0;
        }
        // todo: w a+w b = w(a+b)
        // const res = cmpv(a, b);
        // if (res === 0) {
        //     // a+a
        //     val[i - 1] = mulv(a, 2); val.pop();
        // } else if (res === -1) {
        //     // todo:  w+w2 w+w^2
        //     // val[i - 1] = b; val.pop();
        // }
    }
    //+0
    set = [];
    for (let v of val) {
        if (v === 0)
            continue;
        set.push(v);
    }
    //[a]
    if (set.length === 1)
        return set[0];
    if (set.length === 0)
        return 0;
    return { op: "+", val: set };
}
function v2vAt(v) {
    const vat = { op: "v@", val: [] };
    for (let i = v.val.length - 1; i >= 0; i--) {
        if (v.val[i])
            vat.val.push(v.val[i], i);
    }
    return vat;
}
function vset(v, idx, val) {
    if (v.op === "v") {
        if (isFinite(idx)) {
            const res = { op: "v", val: v.val.slice(0) };
            while (idx >= v.val.length)
                res.val.push(0);
            res.val[idx] = val;
            return res;
        }
        else {
            return vset(v2vAt(v), idx, val);
        }
    }
    if (v.op === "v@" || v.op === "@") {
        for (let i = 0; i < v.val.length; i += 2) {
            const res = cmpv(idx, v.val[i + 1]);
            if (res === 1) {
                v.val.splice(i, 0, val, idx);
                return v;
            }
            if (res === 0) {
                v.val[i] = val;
                return v;
            }
        }
        v.val.push(val, idx);
        return v;
    }
}
function vget(v, idx) {
    if (v.op === "v") {
        if (isFinite(idx)) {
            return v.val[idx] ?? 0;
        }
    }
    if (v.op === "v@") {
        for (let i = 0; i < v.val.length; i += 2) {
            const res = cmpv(idx, v.val[i + 1]);
            if (res === 0) {
                return v.val[i];
            }
        }
    }
    return 0;
}
// console.log(stringify(powv(Infinity, addv(e0, 1))));
// const ooo1 = pows(os(), pows(os(), adds(muls(os(), Infinity), Infinity)));
// console.log(stringify(bocf2veblen(
//     psis(adds(
//         ooo1, pows(os(), psis(ooo1)),
//         muls(psis(ooo1), 2)
//         // psis(pows(os(), pows(os(), muls(os(), Infinity)))),
//     ))
// )));
// console.log(stringify(bocf2veblen(
//     psis(pows(os(), pows(os(), adds(muls(os(),Infinity),os()))))
// )));
// console.log(stringify(bocf2veblen(
//     psis(adds(pows(os(), 2), muls(os(), psis(pows(os(), 2)))))
// )));
// console.log(stringify(bocf2veblen(
//     psis(adds(pows(os(), 3), pows(os(), 2)))
// )));
// console.log(cmpv({ op: "v@", val: [1, Infinity] }, { op: "v@", val: [1, Infinity] }));
// console.log(cmpv({ op: "v@", val: [1, { op: "@", val: [1, 1] }] }, { op: "v@", val: [1, { op: "@", val: [Infinity, Infinity] }] }));
//# sourceMappingURL=veblen.js.map