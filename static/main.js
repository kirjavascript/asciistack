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
const modeEl = document.querySelector('#mode');
const arrowsA = [...document.querySelectorAll('.arrowA')];
const arrowsB = [...document.querySelectorAll('.arrowB')];
const selectedLevelEl = document.querySelector('#selected-level');
const levelNumbersEl = document.querySelector('#level-numbers');
const heightEl = document.querySelector('#height');
const selectedHeightEl = document.querySelector('#selected-height');
const heightNumbersEl = document.querySelector('#height-numbers');

const skipLegalEl = document.querySelector('#skip-legal');
const level29El = document.querySelector('#level-29');

skipLegalEl.addEventListener('click', () => {
    wasm_bindgen.skip_legal();
});

level29El.addEventListener('click', () => {
    wasm_bindgen.killscreen();
});

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
    burnTimer: 0,
    burningRows: undefined,
    playfieldCopy: undefined,
};

function render(shouldUpdate) {
    const input = inputByte();
    const frameData = wasm_bindgen.frame(input);
    if (!shouldUpdate) return;

    handleSFX(frameData);

    if (frameData.isMenu) {
        // menu
        const { menuMode, gameType, level, height, selectingHeight } =
            frameData;

        const typeA = gameType === 'A';
        const isLegal = menuMode === 'CopyrightScreen';
        gameEl.style.display = 'none';
        menuEl.style.display = '';
        skipLegalEl.style.display = isLegal ? '' : 'none';
        level29El.style.display = !isLegal ? '' : 'none';
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
            modeEl.textContent = typeA ? 1 : 2;
        } else if (menuMode === 'LevelSelect') {
            const selectedLevel = level + (((input & 0x80) / 12) | 0);
            selectedLevelEl.textContent = String(selectedLevel).padStart(2, 0);
            const renderNumbers = (str, selected, cond) => {
                let count = 0;
                return str.replace(/\d|#/g, (_) => {
                    const number = count === selected && cond ? '#' : count;
                    count++;
                    return number;
                });
            };
            levelNumbersEl.textContent = renderNumbers(
                levelNumbersEl.textContent,
                level,
                !selectingHeight,
            );
            // btype
            heightEl.style.display = typeA ? 'none' : '';
            selectedHeightEl.textContent = height;
            heightNumbersEl.textContent = renderNumbers(
                heightNumbersEl.textContent,
                height,
                selectingHeight,
            );
        }
        state.lastX = 5;
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
                ((Math.min(16, state.burnTimer) / 16) *
                    (lineClears.length - 1)) |
                0;
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

    padmap && Object.entries(padmap).forEach(([index, mapping]) => {
        if (mapping.length === 2) {
            const [gamepad, button] = mapping;
            if (gamepads[gamepad]?.buttons[button].pressed) {
                byte += controlBytes[index];
            }
        } else if (mapping.length === 3) {
            const [gamepad, axis, direction] = mapping;
            if (Math.round(gamepads[gamepad]?.axes[axis]) === direction) {
                byte += controlBytes[index];
            }
        }
    });
    return byte;
}

window.addEventListener('blur', () => controls.clear());
window.addEventListener('focus', () => controls.clear());

let keymap = {};
let padmap = undefined;

const savedControls = window.localStorage.getItem('controls');
if (savedControls) {
    const controlData = JSON.parse(savedControls);
    keymap = controlData.keymap;
    padmap = controlData.padmap;
    document.querySelector('#controls').textContent = '';
}

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

// gamepad

const gamepads = [];

window.addEventListener(
    'gamepadconnected',
    (event) => {
        const gamepad = event.gamepad;
        gamepads[gamepad.index] = gamepad;
    },
    false,
);
window.addEventListener(
    'gamepaddisconnected',
    (event) => {
        const gamepad = event.gamepad;
        delete gamepads[gamepad.index];
    },
    false,
);

// remapping

const buttonNames = ['Up', 'Down', 'Left', 'Right', 'B', 'A', 'Select', 'Start'];
const pinLookup = [4, 5, 6, 7, 1, 0, 2, 3];

const controlText = document.querySelector('#controls');

document.querySelector('#input').addEventListener('click', () => {
    remap({
        setText: (text) => {
            controlText.textContent = text;
        },
        onComplete: () => {
            controlText.textContent = '';
        },
    });
});

function remap({
    setText,
    onComplete,
}) {
    const keyRemaps = {};
    const padRemaps = {};

    let mapIndex = 0;
    const keydown = (e) => {
        if (!(e.key in keyRemaps)) {
            keyRemaps[e.key] = pinLookup[mapIndex];
            addedMap();
        }
    };

    html.addEventListener('keydown', keydown);

    const interval = setInterval(() => {
        // poll for gamepad presses
        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            const pressed = gamepad.buttons.findIndex((d) => d.pressed);
            if (pressed !== -1) {
                const alreadyPressed = Object.values(padRemaps)
                    .filter((d) => d.length === 2)
                    .some(([_, alreadyPressed]) => alreadyPressed === pressed);
                if (!alreadyPressed) {
                    padRemaps[pinLookup[mapIndex]] = [i, pressed];
                    addedMap();
                    break;
                }
            } else {
                const axes = gamepad.axes.findIndex((d) => Math.abs(d) > 0.51);
                if (axes !== -1) {
                    const direction = Math.round(gamepad.axes[axes]);
                    const alreadyTilted = Object.values(padRemaps)
                        .filter((d) => d.length === 3)
                        .some(
                            ([_, alreadyTilted, alreadyDir]) =>
                            alreadyTilted === axes && alreadyDir === direction,
                        );

                    if (!alreadyTilted) {
                        padRemaps[pinLookup[mapIndex]] = [i, axes, direction];
                        addedMap();
                        break;
                    }
                }
            }
        }
    }, 100);

    const showMessage = () => {
        setText(`Enter input for ${buttonNames[mapIndex]}`);
    };
    showMessage();

    const addedMap = () => {
        mapIndex++;
        if (mapIndex === 8) {
            html.removeEventListener('keydown', keydown);
            clearInterval(interval);

            controls.clear();
            keymap = keyRemaps;
            if (Object.keys(padRemaps)) {
                padmap = padRemaps;
            } else {
                padmap = undefined;
            }

            window.localStorage.setItem(
                'controls',
                JSON.stringify({
                    keymap,
                    padmap,
                }),
            );
            onComplete();
        } else {
            showMessage();
        }
    };
}

// sfx

const sfx = {};

[
    'boop',
    'levelup',
    'rotate',
    'lock',
    'burn',
    'move',
    'sound',
    'maxburn',
    'topout',
].forEach((name) => {
    sfx[name] = () =>
        sfxEnabled &&
        new Audio(`./sfx/${name}.mp3`).play().catch(console.log);
});

const sfxBox = document.querySelector('#sfx');
let sfxEnabled = false;
sfxBox.addEventListener('click', (e) => {
    sfxEnabled = e.target.checked;
    if (sfxEnabled) {
        sfx.sound();
    }
});
sfxEnabled = sfxBox.checked;

const sfxDirty = {
    lastX: 5,
    topout: false,
    burn: false,
    lock: false,
    piece: 0, // track rotate
    moveTimer: 0,
    boopHash: '',
};

function handleSFX(frameData) {
    if (frameData.isMenu) {
        sfxDirty.lastX = 5;
        sfxDirty.topout = false;
        sfxDirty.lock = false;
        sfxDirty.burn = false;
        sfxDirty.moveTimer = 0;
        const hash = JSON.stringify(frameData);
        if (sfxDirty.boopHash !== hash) sfx.boop();
        sfxDirty.boopHash = hash;
    } else {
        const { playState, pieceX, dead, piece } = frameData;

        if (playState === 'MoveTetrimino') {
            if (sfxDirty.lastX !== pieceX) sfx.move();
            sfxDirty.lastX = pieceX;
            if (sfxDirty.moveTimer && sfxDirty.piece !== piece) {
                sfx.rotate();
            }
            sfxDirty.moveTimer++;
        } else {
            sfxDirty.lastX = 5;
            sfxDirty.moveTimer = 0;
        }
        sfxDirty.piece = piece;

        if (dead && !sfxDirty.topout) {
            sfx.topout();
            sfxDirty.topout = true;
        }

        if (playState === 'LockTetrimino') {
            if (!sfxDirty.lock) {
                sfx.lock();
                sfxDirty.lock = true;
            }
        } else {
            sfxDirty.lock = false;
        }

        if (playState === 'DoNothing') {
            if (!sfxDirty.burn) {
                if (state.burningRows.length === 4) {
                    sfx.maxburn();
                } else {
                    sfx.burn();
                }
                sfxDirty.burn = true;
            }
        } else {
            sfxDirty.burn = false;
        }
    }
}
