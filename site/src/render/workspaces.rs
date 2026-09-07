//! The herdr sidebar, before and after.
//!
//! A real session rather than an invention, which is what makes it worth
//! looking at: two of these rows read `unifont` and both are checkouts of
//! fontina, as is the held row above them. Held rows keep the names somebody
//! typed, because that is the argument.

use maud::{Markup, html};

struct Row {
    n: &'static str,
    state: &'static str,
    project: &'static str,
    branch: &'static str,
    worktree: bool,
    since: &'static str,
    before: &'static str,
    after: &'static str,
    held: bool,
}

const ROWS: &[Row] = &[
    Row {
        n: "1",
        state: "working",
        project: "fontina",
        branch: "main",
        worktree: false,
        since: "3m",
        before: "testing",
        after: "testing",
        held: true,
    },
    Row {
        n: "2",
        state: "working",
        project: "fontina",
        branch: "feat/fixed-pitch-check",
        worktree: true,
        since: "1m",
        before: "unifont",
        after: "Richard Stallman perspective",
        held: false,
    },
    Row {
        n: "3",
        state: "working",
        project: "fontina",
        branch: "main",
        worktree: false,
        since: "2m",
        before: "unifont",
        after: "Claude Code settings configuration",
        held: false,
    },
    Row {
        n: "4",
        state: "working",
        project: "cairn",
        branch: "feat/composition",
        worktree: false,
        since: "40m",
        before: "cairn",
        after: "cairn",
        held: true,
    },
    Row {
        n: "5",
        state: "working",
        project: "poptop",
        branch: "item-0028-disk-saturation",
        worktree: false,
        since: "20m",
        before: "perfect",
        after: "Ptop adopt remaining lessons",
        held: false,
    },
    Row {
        n: "6",
        state: "done",
        project: "trafford",
        branch: "feat/move-and-duplicate",
        worktree: false,
        since: "3h",
        before: "milky-xl",
        after: "Terminal Obsidian clone",
        held: false,
    },
];

/// herdr's own state glyphs.
fn glyph(state: &str) -> &'static str {
    match state {
        "idle" => "○",
        "done" => "✓",
        _ => "◑",
    }
}

pub fn panel() -> Markup {
    html! {
        figure class="ws" {
            div class="ws__frame" {
                div class="ws__bar" {
                    span class="ws__dots" aria-hidden="true" { i {} i {} i {} }
                    span class="ws__app" { "herdr" }
                }

                div class="ws__panel" {
                    div class="ws__legend" { "Spaces" }

                    ul class="ws__list" {
                        @for (i, row) in ROWS.iter().enumerate() {
                            li class="ws__row"
                               style={ "--i:" (i) }
                               data-held=(if row.held { "true" } else { "false" }) {
                                span class="ws__meta" {
                                    span class={ "ws__glyph ws__glyph--" (row.state) } { (glyph(row.state)) }
                                    span class="ws__n" { (row.n) }
                                    span class="ws__project" { (row.project) }
                                    @if row.worktree { span class="ws__worktree" { "worktree" } }
                                    @if row.held { span class="ws__flag" { "held" } }
                                    span class="ws__branch" { (row.branch) }
                                    span class="ws__since" { (row.since) }
                                }

                                span class="ws__label" {
                                    span class="ws__name ws__name--before" { (row.before) }
                                    span class="ws__name ws__name--after" { (row.after) }
                                }
                            }
                        }
                    }
                }
            }

            dl class="ws__key t-label" {
                div { dt class="ws__key-n" { "1" }
                      dd { "the key that jumps there — herdr has no token for it" } }
                div { dt class="ws__key-project" { "fontina" }
                      dd { "the repository, never the folder it sits in" } }
                div { dt class="ws__key-flag" { "worktree" }
                      dd { "a linked worktree, not a fourth clone" } }
            }

            figcaption class="ws__caption t-label" {
                "The top line is identity and stays true whether or not the title moves; \
                 the line under it is whatever the agent is describing right now. Two rows say "
                code { "unifont" } " and both are " strong { "fontina" } ", as is the held row \
                 above them — and the two held names were typed by hand and stay as they are."
            }
        }
    }
}
