
#[macro_use]
extern crate lazy_mut;

use lazy_mut::LazyMut::{Value, Init};
use wasm_bindgen::prelude::*;
use js_sys::{Object, Array};
use meta_nestris::state::State;
use meta_nestris::input::Input;

lazy_mut! {
    static mut state: State = State::new();
}


#[wasm_bindgen(start)]
pub unsafe fn main() {
    state.init();
}

#[wasm_bindgen]
pub unsafe fn frame(input: u8) -> JsValue {
    state.step(Input::from(input));

    let response = Object::new();

    match &state {
        Value(State::MenuState(menu_state)) => {
            js_sys::Reflect::set(
                &response,
                &"menuMode".into(),
                &format!("{}", menu_state.menu_mode).into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"isMenu".into(),
                &true.into()
            ).unwrap();

            let game_type = if
                menu_state.game_type == meta_nestris::game_type::GameType::A.into()
            { "A" } else { "B" };

            js_sys::Reflect::set(
                &response,
                &"gameType".into(),
                &game_type.into(),
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"level".into(),
                &menu_state.selected_level.into()
            ).unwrap();

            response.into()
        },
        Value(State::GameplayState(gameplay_state)) => {
            js_sys::Reflect::set(
                &response,
                &"paused".into(),
                &gameplay_state.paused.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"pieceX".into(),
                &gameplay_state.current_piece_x.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"pieceY".into(),
                &gameplay_state.current_piece_y.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"piece".into(),
                &gameplay_state.current_piece.to_id().into()
            ).unwrap();

            let offsets: Array = gameplay_state.current_piece.get_tile_offsets()
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
                }).collect();

            js_sys::Reflect::set(
                &response,
                &"pieceOffsets".into(),
                &offsets,
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"next".into(),
                &gameplay_state.next_piece.to_id().into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"tiles".into(),
                &format!("{}", gameplay_state.tiles).into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"score".into(),
                &gameplay_state.score.into()
            ).unwrap();

            response.into()
        },
        Init(_) => response.into()
    }
}
