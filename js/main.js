import { HandleCanvas } from "./draw.js";
import { SaveLoad } from "./save.js";
export function main() {
    const canvasHandler = new HandleCanvas;
    const saver = new SaveLoad(canvasHandler);
    canvasHandler.onsave = () => !window.location.search ? saver.trySave() : void (0);
    canvasHandler.init();
    if (!window.location.search)
        saver.load();
}
main();
//# sourceMappingURL=main.js.map