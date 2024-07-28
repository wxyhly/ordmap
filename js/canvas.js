import { invDens, outFn } from "./ord.js";
export class HandleCanvas {
    canvas = document.querySelector("canvas");
    range = [-0.000000002, 0.00000002, this.canvas.height * 2]; // [xmin, xmax, yscale]
    // the longest ord in the canvas, refreshed in each draw call
    maxDens = 0;
    totalDrawed = 0;
    maxIteration = 20;
    init() {
        const resize = () => {
            const width = window.innerWidth * window.devicePixelRatio;
            const height = window.innerHeight * window.devicePixelRatio;
            this.canvas.width = width;
            this.canvas.height = height;
            this.draw();
        };
        window.onresize = resize;
        resize();
        let drag = false;
        this.canvas.onmousedown = (ev) => {
            drag = true;
        };
        this.canvas.onmouseout = this.canvas.onmouseleave = this.canvas.onmouseup = (ev) => {
            drag = false;
        };
        this.canvas.onmousemove = (ev) => {
            if (!drag)
                return;
            const dx = -ev.movementX / this.canvas.clientWidth * (this.range[1] - this.range[0]);
            let dy = ev.movementY / this.canvas.clientHeight;
            this.range[0] += dx;
            this.range[1] += dx;
            this.range[2] *= 1 + dy;
            // }
            this.draw();
        };
        this.canvas.onwheel = (ev) => {
            let dy = ev.deltaY / 240;
            dy *= (this.range[1] - this.range[0]);
            const s = ev.clientX / this.canvas.clientWidth;
            this.range[0] -= dy * s;
            this.range[1] += dy * (1 - s);
            this.draw();
        };
        let slide = false;
        window.onkeydown = (ev) => {
            if (ev.ctrlKey)
                slide = true;
        };
        window.onkeyup = (ev) => {
            if (!ev.ctrlKey)
                slide = false;
        };
        const loop = () => {
            if (slide) {
                const target = this.maxDens * 2;
                const now = this.canvas.height / 2;
                this.range[2] *= (now / target - 1) * 0.5 + 1;
                if (Math.abs((now - target) / target) < 0.01)
                    slide = false;
                this.draw();
            }
            window.requestAnimationFrame(loop);
        };
        loop();
    }
    draw() {
        const ct = this.canvas.getContext("2d");
        ct.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ct.strokeStyle = "gray";
        ct.beginPath();
        ct.moveTo(0, this.canvas.height / 2);
        ct.lineTo(this.canvas.width, this.canvas.height / 2);
        ct.stroke();
        ct.strokeStyle = "black";
        ct.beginPath();
        const invScale = this.canvas.width / (this.range[1] - this.range[0]);
        this.maxDens = 0;
        this.totalDrawed = 0;
        this.drawOmega(ct, -this.range[0] * invScale, invScale, this.range[2], this.maxIteration, []);
        ct.stroke();
        ct.font = "20px sans-serif";
        ct.fillText("numbers: " + this.totalDrawed, 20, 30);
    }
    toStringLabel(label) {
        let i;
        let str = [];
        for (let count = 0; count < label.length; count++) {
            i = label[count];
            if (!i)
                continue;
            if (count === 0)
                str.unshift(i.toString());
            const s = (i === 1) ? "" : i.toString();
            if (count === 1)
                str.unshift("ω" + s);
            if (count < 2)
                continue;
            let sc = "";
            for (let c of count.toString()) {
                sc += "⁰¹²³⁴⁵⁶⁷⁸⁹"[c];
            }
            str.unshift("ω" + sc + s);
        }
        return str.join("+") || "0";
    }
    drawOmega(ct, dx, sx, sy, it, label) {
        const step = 2;
        let min = null;
        let drawed = null;
        label = label.slice(0);
        label.unshift(0);
        for (let n = 0; n < this.maxIteration; n++) {
            label[0] = n - 1;
            // v 
            let v = outFn(n);
            let d = invDens(v, n) * sy;
            let max = v * sx + dx;
            min ??= max;
            if (d < step)
                break;
            if (n) {
                const dv = max - min;
                const drawedDv = max - drawed;
                if (drawedDv < 1 || max < 0 || min > this.canvas.width) {
                    min = max;
                    continue;
                }
                if (!it || dv < 1) {
                    if (min > 0)
                        this.maxDens = Math.max(this.maxDens, d);
                    label = label.slice(0);
                    while (label.length <= this.maxIteration)
                        label.unshift(0);
                    let nameOrd = this.toStringLabel(label);
                    if (nameOrd.length === 2 && "¹²³⁴⁵⁶⁷⁸⁹".includes(nameOrd[1])) {
                        console.log(nameOrd + ":" + min);
                    }
                    this.drawOrd(ct, min, d, nameOrd);
                    drawed = max;
                }
                else {
                    const iteration = it - 1; //it === this.maxIteration ? n : it - 1
                    this.drawOmega(ct, min, dv, d, iteration, label);
                }
                min = max;
            }
        }
    }
    drawOrd(ct, pos, dens, label) {
        const xpos = pos;
        this.totalDrawed++;
        dens = Math.min(this.canvas.height * 0.9, dens);
        ct.moveTo(xpos, this.canvas.height / 2 - dens);
        ct.lineTo(xpos, this.canvas.height / 2 + dens);
        if (dens > 50) {
            ct.font = Math.round(dens / 6) + "px sans-serif";
            const hw = ct.measureText(label).width / 2;
            ct.fillText(label, xpos - hw, this.canvas.height / 2 - dens - 60);
        }
    }
}
//# sourceMappingURL=canvas.js.map