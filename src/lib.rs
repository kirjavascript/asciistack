
#[macro_use]
extern crate lazy_mut;

use lazy_mut::LazyMut::{Value, Init};
use meta_nestris::menu_mode::MenuMode;
use wasm_bindgen::prelude::*;
use js_sys::{Object, Array};
use meta_nestris::state::State;
use meta_nestris::input::Input;
use meta_nestris::game_type::GameType;

lazy_mut! {
    static mut STATE: State = State::new();
}


#[wasm_bindgen(start)]
pub unsafe fn main() {
    STATE.init();
}

#[wasm_bindgen]
pub unsafe fn skip_legal() {
    match &mut STATE {
        Value(State::MenuState(state)) => {
            state.copyright_skip_timer = 0;
            state.delay_timer = 0;
        },
        _ => {},

    }
}

#[wasm_bindgen]
pub unsafe fn reset() {
    STATE = Value(State::new());
}

#[wasm_bindgen]
pub unsafe fn level_select() {
    reset();
    match &mut STATE {
        Value(State::MenuState(state)) => {
            state.menu_mode = MenuMode::LevelSelect;
        },
        _ => {},
    }
    skip_legal();
}

fn offsets_to_array(offsets: &[(i8, i8); 4]) -> Array {
    offsets
        .iter()
        .map(|(x, y)| {
            let obj = Object::new();

            js_sys::Reflect::set(
                &obj,
                &"x".into(),
                &(*x).into(),
            ).unwrap();

            js_sys::Reflect::set(
                &obj,
                &"y".into(),
                &(*y).into(),
            ).unwrap();

            obj
        }).collect()
}


#[wasm_bindgen]
pub unsafe fn frame(input: u8) -> JsValue {
    STATE.step(Input::from(input));

    let response = Object::new();

    match &mut STATE {
        Value(State::MenuState(state)) => {

            js_sys::Reflect::set(
                &response,
                &"menuMode".into(),
                &format!("{}", state.menu_mode).into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"isMenu".into(),
                &true.into()
            ).unwrap();

            let game_type = if
                state.game_type ==  GameType::A.into()
            { "A" } else { "B" };

            js_sys::Reflect::set(
                &response,
                &"gameType".into(),
                &game_type.into(),
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"level".into(),
                &state.selected_level.into()
            ).unwrap();

            response.into()
        },
        Value(State::GameplayState(state)) => {

            js_sys::Reflect::set(
                &response,
                &"playState".into(),
                &format!("{:?}", state.play_state).into(),
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"paused".into(),
                &state.paused.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"pieceX".into(),
                &state.current_piece_x.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"pieceY".into(),
                &state.current_piece_y.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"pieceOffsets".into(),
                &offsets_to_array(state.current_piece.get_tile_offsets()),
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"next".into(),
                &state.next_piece.to_id().into(),
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"tiles".into(),
                &format!("{}", state.tiles).into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"score".into(),
                &state.score.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"lines".into(),
                &state.line_count.into()
            ).unwrap();


            js_sys::Reflect::set(
                &response,
                &"level".into(),
                &state.level.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"dead".into(),
                &state.dead.into()
            ).unwrap();

            response.into()
        },
        Init(_) => response.into()
    }
}
