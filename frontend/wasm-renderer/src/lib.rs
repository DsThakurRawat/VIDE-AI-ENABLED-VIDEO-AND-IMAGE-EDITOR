use wasm_bindgen::prelude::*;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[wasm_bindgen]
pub struct VideoRenderer {
    width: u32,
    height: u32,
    // In production, this struct will hold pointers to raw YUV/RGB byte buffers
    // allowing lightning fast frame scrubbing without triggering React re-renders.
}

#[wasm_bindgen]
impl VideoRenderer {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> VideoRenderer {
        web_sys::console::log_1(&"VIDE WASM High-Performance Engine Mounted!".into());
        VideoRenderer { width, height }
    }

    /// Exposes a high-performance render loop directly drawing from Rust memory 
    /// onto the HTML Canvas context, bypassing JavaScript's garbage collector.
    #[wasm_bindgen]
    pub fn render_frame(&self, canvas: &HtmlCanvasElement, timestamp_ms: f64) -> Result<(), JsValue> {
        let ctx = canvas
            .get_context("2d")?
            .unwrap()
            .dyn_into::<CanvasRenderingContext2d>()?;

        // -------------------------------------------------------------
        // MOCK BUFFER GENERATION (Proof of WebAssembly Connection)
        // Generates an animated background based strictly on the timestamp
        // -------------------------------------------------------------
        let r = ((timestamp_ms * 0.001).sin() * 127.0 + 128.0) as u8;
        let g = ((timestamp_ms * 0.002).cos() * 127.0 + 128.0) as u8;
        let b = 180;

        ctx.set_fill_style(&JsValue::from_str(&format!("rgb({}, {}, {})", r, g, b)));
        ctx.fill_rect(0.0, 0.0, self.width as f64, self.height as f64);
        
        ctx.set_fill_style(&JsValue::from_str("white"));
        ctx.set_font("20px monospace");
        ctx.fill_text(&format!("Rust WASM Render Frame @ {:.1}ms", timestamp_ms), 20.0, 40.0)?;
        ctx.fill_text("Buffer: Allocated", 20.0, 70.0)?;

        Ok(())
    }
}
