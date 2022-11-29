
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
pub fn main() {
    unsafe { state.init(); }
}

#[wasm_bindgen]
pub unsafe fn frame(input: u8) -> JsValue {
    state.step(Input::from(input));

    let response = Object::new();

    match &state {
        Value(State::MenuState(menu_state)) => {
            js_sys::Reflect::set(
                &response,
                &"menu-mode".into(),
                &format!("{}", menu_state.menu_mode).into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"menu".into(),
                &true.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"game-type".into(),
                &true.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"level".into(),
                &true.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"height".into(),
                &true.into()
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
                &"x".into(),
                &gameplay_state.current_piece_x.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"y".into(),
                &gameplay_state.current_piece_y.into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"piece".into(),
                &gameplay_state.current_piece.to_id().into()
            ).unwrap();

            js_sys::Reflect::set(
                &response,
                &"tiles".into(),
                &format!("{}", gameplay_state.tiles).into()
            ).unwrap();

            response.into()
        },
        Init(_) => response.into()
    }
}
