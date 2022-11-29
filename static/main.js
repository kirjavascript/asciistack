wasm_bindgen('./asciistack_bg.wasm')
    .then(onLoad)
    .catch(console.error);

const { frame } = wasm_bindgen;

const screen = document.querySelector('.screen');
const frameCount = document.querySelector('.frameCount');


function render(shouldUpdate) {
    const frameData = frame(inputByte());

    if (frameData.isMenu) {

        screen.innerHTML = JSON.stringify(frameData,0,3);
    } else {
        const { tiles, pieceX, pieceY, pieceOffsets } = frameData;
        const tilesArr = JSON.parse(tiles);
        const playfield = [];
        while (tilesArr.length) {
            playfield.push(tilesArr.splice(0, 10).map(d => d ? '#' : '.'));
        }
        pieceOffsets.forEach(({x, y}) => {
            playfield[y+pieceY][x+pieceX] = '#';
        });

        const cleanData = {
            ...frameData,
            tiles: null,
            pieceOffsets: null,
        };


        screen.innerHTML = `
${playfield.map(d=>d.join('')).join(`\n`)}
${JSON.stringify(cleanData,0,3)}
        `;
    }

}


function onLoad() {
    const epoch = performance.now();
    let framesDone = 0;
    const loop = () => {
        requestAnimationFrame(loop);

        const diff = performance.now() - epoch;
        const frames = diff * 0.0600988 | 0;
        const frameAmount = frames - framesDone;
        frameCount.textContent = String(frameAmount);

        if (document.visibilityState !== 'hidden') {
            if (frameAmount > 5) {
                render(true)
            } else {
                for (let i = 0; i < frameAmount; i++) {
                    render(i === frameAmount - 1);
                }
            }
        }

        framesDone = frames;
    };
    loop();
}


// input

const controls = new Set([]);

const controlBytes = [0x80, 0x40, 0x20, 0x10, 0x8, 0x4, 0x2, 0x1]

function inputByte() {
    let byte = 0;
    for (bit of controls) {
        byte += controlBytes[bit];
    }
    return byte;
}

window.addEventListener('blur', () => controls.clear());
window.addEventListener('focus', () => controls.clear());

let keymap = {};

[
    ['x', 'X', 'm', 'M'], // A
    ['z', 'Z', 'n', 'N'], // B
    ['Shift', 'c', 'C'], // select
    ['Enter', 'v', 'V'], // start
    ['ArrowUp', 'w', 'W', 'i', 'I'], // U
    ['ArrowDown', 's', 'S', 'k', 'K'], // D
    ['ArrowLeft', 'a', 'A', 'j', 'J'], // L
    ['ArrowRight', 'd', 'D', 'l', 'L'], // R
].forEach((keys, index) => {
    keys.forEach((key) => {
        keymap[key] = index;
    });
});


// keyboard

const html = document.documentElement;

html.addEventListener('keydown', (e) => {
    if (e.key in keymap) {
        const index = keymap[e.key];
        // handle SOCD as second input priority for L/R
        if (index === 6) controls.delete(7);
        if (index === 7) controls.delete(6);
        controls.add(index);
        e.preventDefault();
    }
});
html.addEventListener('keyup', (e) => {
    if (e.key in keymap) {
        controls.delete(keymap[e.key]);
        e.preventDefault();
    }
});
