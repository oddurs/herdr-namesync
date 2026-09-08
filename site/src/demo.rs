//! The before-and-after, as a file a README can show.
//!
//! GitHub renders the landing page's mock not at all — it is HTML in a Rust
//! template. The repository page and the marketplace index are where most
//! people meet this plugin, so the picture has to survive being looked at
//! there.
//!
//! Drawn from `workspaces::ROWS`, the same real session the hero draws, so the
//! two cannot drift into describing different sessions.
//!
//! SVG rather than a raster: it is text, so it stays sharp at any size, it
//! diffs in review, and regenerating it needs no image tooling. The font stack
//! is generic monospace on purpose — a web font would not load inside GitHub's
//! sanitiser, so the reader's own mono is what draws it.

use crate::render::workspaces::{ROWS, glyph};
use anyhow::{Context, Result};
use std::path::Path;

// Gotham, the same values tokens.css defines.
const BG: &str = "#070d12";
const PANEL: &str = "#0a0f14";
const BORDER: &str = "#14303f";
const ACCENT: &str = "#33859d";
const BRIGHT: &str = "#d3ebe9";
const MUTED: &str = "#888ba5";
const LIVE: &str = "#599caa";
const HELD: &str = "#d26939";
const SUBTLE: &str = "#5b8391";

const W: usize = 760;
const ROW_H: usize = 46;
const PAD: usize = 22;
const COL: usize = W / 2;

fn esc(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// Monospace at this size runs about 0.6em to the character. Good enough to
/// lay out a row without measuring a font we are not shipping.
fn advance(text: &str, size: usize) -> usize {
    (text.chars().count() as f32 * size as f32 * 0.6).ceil() as usize + 7
}

fn label(x: usize, y: usize, fill: &str, size: usize, bold: bool, text: &str) -> String {
    format!(
        r#"<text x="{x}" y="{y}" fill="{fill}" font-size="{size}"{weight}>{t}</text>"#,
        weight = if bold { r#" font-weight="600""# } else { "" },
        t = esc(text),
    )
}

/// One column: what herdr shows on its own, or what it shows with namesync
/// publishing into it.
fn column(x: usize, heading: &str, after: bool) -> String {
    let mut out = label(x + PAD, PAD + 14, SUBTLE, 11, false, heading);

    for (i, row) in ROWS.iter().enumerate() {
        let top = PAD + 40 + i * ROW_H;

        if !after {
            /* herdr alone: the directory the space was opened in, and no more.
            Set on the same baseline as the name opposite rather than
            centred in the row, so the two labels can be read against each
            other without the eye travelling. */
            out.push_str(&label(x + PAD, top + 33, MUTED, 13, false, row.before));
            continue;
        }

        let mut cursor = x + PAD;
        for (text, fill, size, bold) in [
            (glyph(row.state), LIVE, 12, false),
            (row.n, ACCENT, 12, true),
            (row.project, BRIGHT, 12, true),
        ] {
            out.push_str(&label(cursor, top + 14, fill, size, bold, text));
            cursor += advance(text, size);
        }
        for (text, shown) in [("worktree", row.worktree), ("held", row.held)] {
            if shown {
                out.push_str(&label(cursor, top + 14, HELD, 11, false, text));
                cursor += advance(text, 11);
            }
        }
        for text in [row.branch, row.since] {
            out.push_str(&label(cursor, top + 14, MUTED, 11, false, text));
            cursor += advance(text, 11);
        }

        // A held name is somebody's writing, so it keeps full strength.
        let fill = if row.held { BRIGHT } else { LIVE };
        out.push_str(&label(x + PAD, top + 33, fill, 13, false, row.after));
    }
    out
}

pub fn svg() -> String {
    let height = PAD * 2 + 40 + ROWS.len() * ROW_H;
    format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{height}" viewBox="0 0 {W} {height}" role="img" aria-label="A herdr sidebar before and after namesync">
<style>text {{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }}</style>
<rect width="{W}" height="{height}" fill="{BG}"/>
<rect x="{COL}" y="0" width="{COL}" height="{height}" fill="{PANEL}"/>
<line x1="{COL}" y1="0" x2="{COL}" y2="{height}" stroke="{BORDER}"/>
{left}
{right}
</svg>
"#,
        left = column(0, "herdr on its own", false),
        right = column(COL, "with namesync", true),
    )
}

pub fn write(out: &Path) -> Result<()> {
    if let Some(parent) = out.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(out, svg()).with_context(|| format!("writing {}", out.display()))?;
    println!("wrote {}", out.display());
    Ok(())
}
