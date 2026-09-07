//! The page frame every route shares.

use super::{Ctx, logo};
use maud::{DOCTYPE, Markup, PreEscaped, html};

/// Injected only by the live server. A built page never carries it, so what
/// ships is exactly what the renderer produced with nothing bolted on.
const RELOAD: &str = r#"
new EventSource("/_live").onmessage = () => location.reload();
"#;

pub struct Page<'a> {
    pub title: &'a str,
    pub description: &'a str,
    /// Marks the current top-level section in the masthead.
    pub section: &'a str,
    pub body: Markup,
}

pub fn render(ctx: &Ctx, page: Page<'_>) -> Markup {
    html! {
        (DOCTYPE)
        html lang="en" {
            head {
                meta charset="utf-8";
                meta name="viewport" content="width=device-width, initial-scale=1";
                title { (page.title) }
                meta name="description" content=(page.description);
                meta name="color-scheme" content="dark";
                meta name="theme-color" content="#0a0f14";
                link rel="icon" href=(ctx.url("favicon.svg")) type="image/svg+xml";

                link rel="preconnect" href="https://fonts.googleapis.com";
                link rel="preconnect" href="https://fonts.gstatic.com" crossorigin;
                link rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=IBM+Plex+Mono:wght@400;500&display=swap";

                // One stylesheet, concatenated in layer order at build time.
                link rel="stylesheet" href=(ctx.url("styles.css"));
            }

            body {
                header class="masthead t-ui" {
                    a href=(ctx.url("")) class="masthead__brand" aria-label="herdr-namesync home" {
                        (logo::lockup("var(--step-0)"))
                    }
                    nav class="masthead__nav" {
                        a href=(ctx.url("docs/install"))
                          aria-current=[(page.section == "docs").then_some("page")] { "docs" }
                        a href="https://github.com/oddurs/herdr-namesync" { "source" }
                    }
                }

                (page.body)

                footer class="colophon t-label" {
                    div { "herdr-namesync — keeps terminal workspace names in step with the work." }
                    div { "Gotham palette by Andrew Wong. Set in IBM Plex Sans and IBM Plex Mono." }
                }

                @if ctx.live {
                    script { (PreEscaped(RELOAD)) }
                }
            }
        }
    }
}
