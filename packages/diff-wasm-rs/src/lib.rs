use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
struct PatchOp {
    op: String,
    id: String,
    html: Option<String>,
}

#[wasm_bindgen]
pub fn diff_html(prev_html: &str, next_html: &str, root_id: &str) -> String {
    if prev_html == next_html {
        return "[]".to_string();
    }

    let op = PatchOp {
        op: "replace".to_string(),
        id: root_id.to_string(),
        html: Some(next_html.to_string()),
    };

    serde_json::to_string(&vec![op]).unwrap_or_else(|_| "[]".to_string())
}
