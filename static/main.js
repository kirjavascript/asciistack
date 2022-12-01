wasm_bindgen('./asciistack_bg.wasm').then(onLoad).catch(console.error);

const debug = document.querySelector('.debug');
const frameCount = document.querySelector('.frameCount');

const playfieldEl = document.querySelector('.playfield');
const gameEl = document.querySelector('.game');
const menuEl = document.querySelector('.menu');
const pauseEl = document.querySelector('#pause');
const scoreEl = document.querySelector('#score');
const linesEl = document.querySelector('#lines');
const levelEl = document.querySelector('#level');
const nextEl = document.querySelector('#next-hover');
const modeEl = [...document.querySelectorAll('#mode')];
const arrowsA = [...document.querySelectorAll('.arrowA')];
const arrowsB = [...document.querySelectorAll('.arrowB')];
const selectedLevelEl = document.querySelector('#selected-level');
const levelNumbersEl = document.querySelector('#level-numbers');
const heightEl = document.querySelector('#height');
const selectedHeightEl = document.querySelector('#selected-height');
const heightNumbersEl = document.querySelector('#height-numbers');

const skipLegalEl = document.querySelector('#skip-legal');

skipLegalEl.addEventListener('click', () => {
    wasm_bindgen.skip_legal();
});

// TODO
// sfx

debug.style.display = 'none';

const nextPieces = {
    [0x12]: ['####', 1, 3.5],
    [0x02]: ['###\n #', 1.5, 3.1],
    [0x7]: ['###\n  #', 1.5, 3.1],
    [0x8]: ['##\n ##', 1.5, 3.1],
    [0xa]: ['##\n##', 2, 3.1],
    [0xb]: [' ##\n##', 1.5, 3.1],
    [0xe]: ['###\n#', 1.5, 3.1],
};

const lineClears = [
    '####  ####',
    '###    ###',
    '##      ##',
    '#        #',
    '          ',
];

// JS tracked stuff
const state = {
    lastX: 5, // to check for movement
    burnTimer: 0,
    burningRows: undefined,
    playfieldCopy: undefined,
};

function render(shouldUpdate) {
    const input = inputByte();
    const frameData = wasm_bindgen.frame(input);
    if (!shouldUpdate) return;

    if (frameData.isMenu) {
        // menu
        const { menuMode, gameType, level, height, selectingHeight } = frameData;
        const typeA = gameType === 'A';
        gameEl.style.display = 'none';
        menuEl.style.display = '';
        skipLegalEl.style.display =
            menuMode === 'CopyrightScreen' ? '' : 'none';
        debug.innerHTML = JSON.stringify(frameData, 0, 3);
        [...menuEl.children].forEach((node) => {
            node.style.display = node.id === menuMode ? '' : 'none';
        });
        if (menuMode === 'GameTypeSelect') {
            arrowsA.forEach((node) => {
                node.textContent = typeA ? node.dataset.glyph : ' ';
            });
            arrowsB.forEach((node) => {
                node.textContent = !typeA ? node.dataset.glyph : ' ';
            });
            mode.textContent = gameType === 'A' ? 1 : 2;
        } else if (menuMode === 'LevelSelect') {
            const selectedLevel = level + (((input & 0x80) / 12) | 0);
            selectedLevelEl.textContent = String(selectedLevel).padStart(2, 0);
            const renderNumbers = (str, selected, cond) => {
                let count = 0;
                return str.replace(
                    /\d|#/g,
                    (_) => {
                        const number = count === selected && cond ? '#' : count;
                        count++;
                        return number;
                    },
                )
            };
            levelNumbersEl.textContent = renderNumbers(levelNumbersEl.textContent, level, !selectingHeight);
            // btype
            heightEl.style.display = typeA ? 'none' : '';
            selectedHeightEl.textContent = height;
            heightNumbersEl.textContent = renderNumbers(heightNumbersEl.textContent, height, selectingHeight);
        }
    } else {
        // gameplay
        gameEl.style.display = '';
        menuEl.style.display = 'none';

        const {
            tiles,
            pieceX,
            pieceY,
            pieceOffsets,
            next,
            score,
            lines,
            level,
            playState,
            paused,
            dead,
        } = frameData;

        pauseEl.style.display = paused ? '' : 'none';
        const tilesArr = JSON.parse(tiles);
        const playfield = [];
        while (tilesArr.length) {
            playfield.push(tilesArr.splice(0, 10).map((d) => (d ? '#' : ' ')));
        }

        if (['MoveTetrimino', 'LockTetrimino'].includes(playState)) {
            pieceOffsets.forEach(({ x, y }) => {
                const Y = y + pieceY;
                if (Y >= 0) {
                    playfield[Y][x + pieceX] = '#';
                }
            });
        }

        if (playState === 'LockTetrimino') {
            state.burningRows = undefined;
        } else if (playState === 'CheckForCompletedRows') {
            if (!state.burningRows) {
                state.burningRows = playfield
                    .map((d, i) => [i, d.join('')])
                    .filter(([_, str]) => str === '##########')
                    .map(([i]) => i);
                state.playfieldCopy = playfield;
            }
            playfield.splice(0, playfield.length, ...state.playfieldCopy);
        } else if (playState === 'DoNothing') {
            // burning
            // use copy of playfield for animation
            playfield.splice(0, playfield.length, ...state.playfieldCopy);
            // line burns
            const index =
                ((Math.min(16, state.burnTimer) / 16) * (lineClears.length - 1)) | 0;
            state.burningRows.forEach((i) => {
                playfield[i] = lineClears[index].split('');
            });
            state.burnTimer++;
        } else {
            state.burnTimer = 0;
        }

        if (dead && input & 0x10) {
            wasm_bindgen.level_select();
        }

        if ((input & 0xf0) === 0xf0) {
            wasm_bindgen.reset();
        }

        playfieldEl.textContent = playfield
            .slice(0, 20)
            .map((d) => '|' + d.join('') + '|')
            .join(`\n`);
        scoreEl.textContent = String(score).padStart(7, 0);
        linesEl.textContent = String(lines).padStart(4, 0);
        levelEl.textContent = String(level).padStart(2, 0).padStart(3);

        nextEl.textContent = nextPieces[next][0];
        nextEl.style.left = nextPieces[next][1] + 'em';
        nextEl.style.top = nextPieces[next][2] + 'em';

        const cleanData = {
            ...frameData,
            tiles: null,
            pieceOffsets: null,
            nextOffsets: null,
            input,
        };

        debug.innerHTML = JSON.stringify(cleanData, 0, 3);
    }
}

function onLoad() {
    const epoch = performance.now();
    let framesDone = 0;
    const loop = () => {
        requestAnimationFrame(loop);

        const diff = performance.now() - epoch;
        const frames = (diff * 0.0600988) | 0;
        const frameAmount = frames - framesDone;
        frameCount.textContent = String(frameAmount);

        if (document.visibilityState !== 'hidden') {
            if (frameAmount > 5) {
                render(true);
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

const controlBytes = [0x80, 0x40, 0x20, 0x10, 0x8, 0x4, 0x2, 0x1];

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
