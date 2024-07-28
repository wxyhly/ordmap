import { cmp, expand, muls, os, pows, printVal, psis } from "./bocf.js";
import { rescaleDeltaX, rescaleX, rescaleY } from "./mesure.js";
const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
export class HandleCanvas {
    canvas = document.querySelector("canvas");
    // scale wheel speed
    scaleSpeed = 0.001;
    range = [60, this.canvas.width * (window.location.search === "?0Y" ? 1 : 1.4e3), this.canvas.height / 6]; // [xmin, xmax, yscale]
    // the longest ord in the canvas, refreshed in each draw call
    maxDens = 0;
    // the second longest ord in the canvas, refreshed in each draw call
    secondDens = 0;
    // total drawed bars, refreshed in each draw call
    totalDrawed = 0;
    // max length for each list
    maxIteration = 200;
    // max Depth for expand, currently can't beyond 30, since error: rescaleX[31] > 1
    maxDepth = 30;
    // min X distance to draw
    deltaX = 1.5;
    // min height to draw
    deltaY = 1.5;
    // min text height to draw
    deltaTextY = 400;
    // below this width and deltaTextY, test whether close to succ 1, if not  skip calc ord
    trySkipWidth = 800;
    // coord: Chunk[] = [{ ord: { op: "0Y", val: [1, 5] }, preOrd: 0, preOrdDens: 1, min: 0, max: 1, dens: 1 }];
    // coord: Chunk[] = [{ ord: { op: "i", val: [] }, preOrd: 0, preOrdDens: 1, min: 0, max: 1, dens: 1 }];
    coord = window.location.search === "?0Y" ? [{ ord: { op: "0Y", val: [1, 5] }, preOrd: 0, preOrdDens: 1, min: 0, max: 1, dens: 1 }] : [{ "ord": { "op": "p", "val": [{ "op": "*", "val": [{ "op": "o", "val": [1] }, Infinity] }, 0] }, "preOrd": 0, "dens": 197.38334721841863, "max": 4476146.566031095, "min": 960, "preOrdDens": 1.871991762259063, "lastMax": 1440000000000000, "lastMin": 960, "lastDens": 369.5 }, { "ord": { "op": "i", "val": [] }, "preOrd": 0, "dens": 1, "max": 1, "min": 0, "preOrdDens": 1 }];
    changeCoord = null;
    labels = [];
    selected = null;
    onsave;
    add1ord = [psis(os(Infinity)), psis(pows(os(), Infinity)), psis(muls(os(), Infinity)), psis(os(2))];
    init() {
        const resize = () => {
            const width = window.innerWidth * window.devicePixelRatio;
            const height = window.innerHeight * window.devicePixelRatio;
            this.range[0] *= width / this.canvas.width;
            this.range[1] *= width / this.canvas.width;
            this.range[2] *= height / this.canvas.height;
            this.canvas.width = width;
            this.canvas.height = height;
            this.draw();
        };
        window.onresize = resize;
        resize();
        let drag = false;
        let touch = "";
        this.canvas.onmousedown = (ev) => {
            ev.preventDefault();
            drag = true;
        };
        this.canvas.onmouseout = this.canvas.onmouseleave = this.canvas.onmouseup = (ev) => {
            drag = false;
        };
        const keepSelected = () => {
            if (this.selected) {
                this.selected = this.labels.find(l => l.text === this.selected.text);
            }
        };
        const findSelected = (evX) => {
            const pos = evX * window.devicePixelRatio;
            if (isMobile) {
                if (pos < this.canvas.width * 0.1)
                    return;
            }
            const res = this.labels.filter(e => Math.abs(e.pos - pos) < 25);
            let gap = Infinity;
            let selected = null;
            for (const e of res) {
                const v = Math.abs(e.pos - pos);
                if (v < gap) {
                    gap = v;
                    selected = e;
                }
                Math.abs(e.pos - pos);
            }
            if (this.selected !== selected) {
                redraw = true;
                this.selected = selected;
            }
        };
        this.canvas.onmousemove = (ev) => {
            if (drag) {
                let dy = ev.movementY / this.canvas.clientHeight;
                const dx = ev.movementX * window.devicePixelRatio;
                this.range[0] += dx;
                this.range[1] += dx;
                this.range[2] *= 1 + dy;
                this.draw();
            }
            if (!touch)
                findSelected(ev.clientX);
        };
        let moveStartX = null;
        let moveStartY = null;
        let moveDeltaX = 0;
        let moveDeltaY = 0;
        let moveEndX = null;
        let moveEndY = null;
        this.canvas.ontouchstart = (ev) => {
            const ct = this.canvas.getContext("2d");
            moveEndX = moveStartX = ev.changedTouches.item(0).clientX;
            moveEndY = moveStartY = ev.changedTouches.item(0).clientY;
            touch = moveStartX * window.devicePixelRatio > this.canvas.width * 0.1 ? "move" : "scale";
        };
        this.canvas.ontouchend = (ev) => {
            const ct = this.canvas.getContext("2d");
            this.draw();
            moveStartX = null;
            moveStartY = null;
            if (touch === "scale")
                ev.stopPropagation();
            touch = "";
            slide = false;
        };
        this.canvas.ontouchmove = (ev) => {
            ev.preventDefault();
            moveDeltaX = -moveEndX;
            moveDeltaY = -moveEndY;
            moveEndX = ev.changedTouches.item(0).clientX;
            moveEndY = ev.changedTouches.item(0).clientY;
            moveDeltaX += moveEndX;
            moveDeltaY += moveEndY;
            if (touch === "move") {
                findSelected(ev.changedTouches.item(0).clientX);
            }
        };
        const doScale = (deltaY, center) => {
            let dy = 1 - Math.exp(-deltaY * this.scaleSpeed);
            if (this.range[1] - this.range[0] < this.canvas.width * 0.8 && this.coord.length < 3) {
                dy = Math.min(0, dy);
            }
            else if (this.totalDrawed < 6) {
                dy = Math.max(0, dy);
            }
            const s = this.selected?.pos ?? center * window.devicePixelRatio;
            const old0 = this.range[0];
            const old1 = this.range[1];
            this.range[0] += (s - this.range[0]) * dy;
            this.range[1] += (s - this.range[1]) * dy;
            if (this.range[0] >= this.range[1]) {
                this.range[0] = old0;
                this.range[1] = old1;
            }
            redraw = true;
        };
        this.canvas.onwheel = (ev) => {
            ev.preventDefault();
            doScale(ev.deltaY, ev.clientX);
            keepSelected();
        };
        let slide = false;
        let slideMode = 1; // 1 for max, 2 for second
        let redraw = false;
        window.onkeydown = (ev) => {
            if (ev.code === "Space") {
                slide = true;
                slideMode = 1;
            }
            if (ev.shiftKey) {
                slide = true;
                slideMode = 2;
            }
            if (ev.code === "KeyW") {
                this.maxDepth++;
                redraw = true;
            }
            if (ev.code === "KeyS" && this.maxDepth > 1) {
                this.maxDepth--;
                redraw = true;
            }
            if (ev.code === "KeyT") {
                this.scaleSpeed *= 1.1;
                if (this.scaleSpeed > 0.015)
                    this.scaleSpeed = 0.015;
                redraw = true;
            }
            if (ev.code === "KeyG") {
                this.scaleSpeed /= 1.1;
                if (this.scaleSpeed < 0.001)
                    this.scaleSpeed = 0.001;
                redraw = true;
            }
        };
        window.onkeyup = (ev) => {
            slide = false;
        };
        const loop = () => {
            if (touch === "move") {
                let dy = (moveDeltaY) / this.canvas.clientHeight;
                const dx = (moveDeltaX) * window.devicePixelRatio;
                this.range[0] += dx;
                this.range[1] += dx;
                this.range[2] *= 1 + dy;
                redraw = true;
            }
            if (touch === "scale") {
                if (moveEndX * window.devicePixelRatio > this.canvas.width * 0.1) {
                    slideMode = 2;
                    slide = true;
                }
                doScale((moveEndY - this.canvas.clientHeight / 2) * (0.2 + moveEndX * moveEndX * 0.00001), this.canvas.clientWidth / 2);
                keepSelected();
            }
            if (slide) {
                if (!(slideMode === 2 && this.maxDens === this.secondDens)) {
                    const target = (slideMode === 1 ? this.maxDens : this.secondDens) * 2;
                    const now = this.canvas.height / 2;
                    this.range[2] *= (now / target - 1) * 0.5 + 1;
                    if (Math.abs((now - target) / target) < 0.01)
                        slide = false;
                    redraw = true;
                }
                else {
                    slide = false;
                }
            }
            if (redraw) {
                this.draw();
                redraw = false;
            }
            moveDeltaX = 0;
            moveDeltaY = 0;
            window.requestAnimationFrame(loop);
        };
        loop();
    }
    draw() {
        this.onsave();
        const ct = this.canvas.getContext("2d");
        ct.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ct.strokeStyle = "rgb(20,160,193)";
        ct.beginPath();
        ct.moveTo(0, this.canvas.height / 2);
        ct.lineTo(this.canvas.width, this.canvas.height / 2);
        ct.stroke();
        ct.strokeStyle = "black";
        ct.beginPath();
        const preMax = this.maxDens;
        this.maxDens = 0;
        this.secondDens = 0;
        this.totalDrawed = 0;
        this.labels = [];
        this.changeCoord = null;
        const coord = this.coord[0];
        // draw fractal
        this.drawOmega(ct, coord.ord, coord.preOrd, coord.preOrdDens * this.range[2], this.range[0], this.range[1], this.range[2], this.maxDepth);
        // draw pred
        if (this.range[0] > 0 && coord.preOrdDens)
            this.drawOrd(ct, this.range[0], coord.preOrdDens * this.range[2], printVal(coord.preOrd), coord.preOrd);
        ct.stroke();
        // draw selected
        if (this.selected) {
            ct.strokeStyle = "red";
            ct.beginPath();
            ct.moveTo(this.selected.pos, 0);
            ct.lineTo(this.selected.pos, this.canvas.height);
            ct.stroke();
        }
        // draw text
        ct.font = "20px sans-serif";
        ct.fillText("numbers: " + this.totalDrawed, 20, 30);
        let Xscale = this.coord.map(v => Math.log((v.max - v.min) / ((v.lastMax - v.lastMin) > 0 ? v.lastMax - v.lastMin : 1))).reduce((a, b) => a + b) + Math.log(this.canvas.width / (this.range[1] - this.range[0]));
        let xstr;
        if (!true && Xscale > -1) {
            xstr = Math.exp(Xscale).toExponential(3);
        }
        else {
            const log10f = (Xscale / Math.LN10);
            const log10i = Math.floor(log10f);
            const log10e = log10f - log10i;
            xstr = Math.pow(10, log10e).toFixed(3) + "e" + log10i;
        }
        ct.fillText("X - scale: " + xstr, 20, 50);
        const Yscale = this.coord.map(v => v.dens / (v.lastDens ?? 1)).reduce((a, b) => a * b) / this.range[2] * this.canvas.height / 4;
        ct.fillText("Y - scale: " + Yscale.toExponential(3), 20, 70);
        const str = printVal(coord.ord);
        ct.fillText("Scope: " + (str.length > 200 ? str.slice(0, 97) + " ... " + str.slice(-97) : str), 20, 100);
        if (isMobile) {
            ct.fillRect(this.canvas.width * 0.04, this.canvas.height * 0.7, this.canvas.width * 0.02, this.canvas.width * 0.002);
            ct.fillRect(this.canvas.width * 0.049, this.canvas.height * 0.3 - this.canvas.width * 0.009, this.canvas.width * 0.002, this.canvas.width * 0.02);
            ct.fillRect(this.canvas.width * 0.04, this.canvas.height * 0.3, this.canvas.width * 0.02, this.canvas.width * 0.002);
            ct.fillStyle = "rgba(0,0,255,0.1)";
            ct.fillRect(0, 0, this.canvas.width * 0.1, this.canvas.height);
            ct.fillStyle = "rgba(0,0,0)";
        }
        else {
            ct.fillText("Zoom Speed: " + (this.scaleSpeed * 1000).toPrecision(3), 20, 130);
        }
        if (this.maxDens <= 0) {
            this.maxDens = preMax;
        }
        if (this.secondDens <= 0)
            this.secondDens = this.maxDens;
        // coord convertion
        const { min, max } = this.changeCoord || { min: this.range[0], max: this.range[1] };
        const fullscreen = max > this.canvas.width && min < (max - min) / this.range[2];
        if (!fullscreen) {
            const { min, max } = { min: this.range[0], max: this.range[1] };
            if (max > this.canvas.width && min < (max - min) / this.range[2])
                return;
            // zoom out
            const zoom = this.coord.shift();
            if (!zoom?.lastDens) {
                this.coord.unshift(zoom);
                return;
            }
            // f(a') = a
            // f(b') = b
            // f(x) = (x-a')*(b-a)/(b'-a')+a
            // k = (b-a)/(b'-a')
            const k = (this.range[1] - this.range[0]) / (zoom.max - zoom.min);
            this.range[0] = (zoom.lastMin - zoom.min) * k + this.range[0];
            this.range[1] = (zoom.lastMax - zoom.max) * k + this.range[1];
            this.range[2] *= zoom.lastDens / zoom.dens;
            this.draw();
        }
        else if (true || this.range[1] - this.range[0] > 1e5) {
            // zoom in
            if (!this.changeCoord)
                return;
            if (this.changeCoord.ord && this.coord[0].ord && cmp(this.changeCoord.ord, this.coord[0].ord) === 0)
                return;
            this.changeCoord.lastMin = this.range[0];
            this.changeCoord.lastMax = this.range[1];
            this.changeCoord.lastDens = this.range[2];
            if (cmp(this.changeCoord.preOrd, this.coord[0].preOrd) === 0) {
                this.changeCoord.preOrdDens = this.coord[0].preOrdDens * this.changeCoord.lastDens / this.changeCoord.dens;
            }
            else {
                this.changeCoord.preOrdDens *= this.changeCoord.lastDens / this.changeCoord.dens / this.range[2];
            }
            this.coord.unshift(this.changeCoord);
            this.range[0] = this.changeCoord.min;
            this.range[1] = this.changeCoord.max;
            this.range[2] = this.changeCoord.dens;
        }
    }
    drawOmega(ct, ord, preOrd, preOrdDens, min, max, dens, it) {
        if (it <= 0 || max < 0 || min > this.canvas.width)
            return;
        const width = max - min;
        if (ord !== null && max > this.canvas.width && min < (max - min) * 4e-4) {
            this.changeCoord = { ord, preOrd, preOrdDens, min, max, dens };
        } // todo : else brach: optimise to skip check this for sub
        const label = ord !== null ? printVal(ord) : "";
        if (max < this.canvas.width)
            this.drawOrd(ct, max, dens, label.length * 5 < width + 5 ? label : "", ord);
        let cursor = min; // prev drawed pos
        let shift = ord ? ord.op === "0Y" ? -1 : this.add1ord.find(e => cmp(e, ord) === 0) ? 1 : 0 : 0;
        let findingShift = true;
        for (let n = 1; n < this.maxIteration; n++) {
            let subOrd = null;
            if (ord !== null) {
                if (!findingShift)
                    subOrd = expand(ord, n + shift);
                while (findingShift) {
                    subOrd = expand(ord, n + shift);
                    // if ord is succ, return
                    if (subOrd === null || subOrd === false) {
                        return;
                    }
                    if (shift > 3) {
                        console.error(printVal(preOrd), printVal(subOrd));
                        break;
                    }
                    // if list is repeated, succ
                    if (preOrd && cmp(preOrd, subOrd) !== -1) {
                        shift++;
                    }
                    else {
                        break;
                    }
                }
                findingShift = false;
            }
            // else calc nonlinear rescaling
            let nv = rescaleX[n]; // a val in [0,1)
            let ndrel = rescaleY[n];
            let nd = ndrel * dens;
            // if too short, stop
            if (nd < this.deltaY)
                break;
            let npos = min + nv * width;
            // if too tight, skip some bars
            if (npos - cursor < this.deltaX)
                continue;
            // test whether skip calc subord
            let sparse = true;
            if (subOrd && nd < this.deltaTextY && n > 1 && width < this.trySkipWidth) {
                sparse = false;
                let snd = nd;
                let sub = subOrd;
                while (snd > rescaleX[1]) {
                    // if (cmp(preOrd, psis(os())) === 0) {
                    //     console.log("oma");
                    // }
                    let nshift = 1;
                    snd *= rescaleX[1];
                    let subsub;
                    // if ord is succ, return
                    while (true) {
                        subsub = expand(sub, nshift);
                        if (subsub === null || subsub === false) {
                            sparse = true;
                            snd = 0; // break outter while
                            break;
                        }
                        // if list is repeated, succ
                        if (preOrd && cmp(preOrd, subsub) !== -1) {
                            nshift++;
                        }
                        else {
                            break;
                        }
                    }
                    sub = subsub;
                }
            }
            // draw subord
            const startPos = npos - rescaleDeltaX[n] * width;
            this.drawOmega(ct, !sparse ? null : subOrd, preOrd, preOrdDens, startPos, npos, nd, it - 1);
            preOrd = subOrd;
            preOrdDens = nd;
            cursor = npos;
        }
    }
    drawOrd(ct, pos, dens, label, ord) {
        this.totalDrawed++;
        if (dens < this.maxDens) {
            if (dens > this.secondDens)
                this.secondDens = dens;
        }
        else {
            this.secondDens = this.maxDens;
            this.maxDens = dens;
        }
        dens = Math.min(this.canvas.height * 0.9, dens);
        ct.moveTo(pos, this.canvas.height / 2 - dens);
        ct.lineTo(pos, this.canvas.height / 2 + dens);
        if (label === "")
            return;
        label = printVal(ord);
        const size = (dens / (label.length + 1) + 8) * 0.8;
        if (label.length > 200)
            label = label.slice(0, 96) + " .... " + label.slice(-96);
        ct.font = Math.round(size) + "px sans-serif";
        const hw = ct.measureText(label).width / 2;
        ct.fillText(label, pos - hw, this.canvas.height / 2 - dens - 60);
        const label2 = printVal(ord, "veblen");
        const hw2 = ct.measureText(label2).width / 2;
        ct.fillText(label2, pos - hw2, this.canvas.height / 2 + dens + 60 + size * 0.8);
        if (ord || ord === 0)
            this.labels.push({ pos, ord, text: label });
    }
}
//# sourceMappingURL=draw.js.map