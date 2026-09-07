//! The documentation reader: sidebar, article, pager.

use super::Ctx;
use super::layout::{self, Page};
use crate::content::Doc;
use maud::{Markup, PreEscaped, html};

pub fn render(ctx: &Ctx, docs: &[Doc], current: usize) -> Markup {
    let doc = &docs[current];
    let prev = current.checked_sub(1).and_then(|i| docs.get(i));
    let next = docs.get(current + 1);

    let body = html! {
        div class="shell" {
            nav class="toc" aria-label="Documentation" {
                ol class="t-ui" {
                    @for item in docs {
                        li {
                            a href=(ctx.url(&format!("docs/{}", item.slug)))
                              aria-current=[(item.slug == doc.slug).then_some("page")] {
                                (item.title)
                            }
                        }
                    }
                }
            }

            main class="reader" {
                article class="prose" {
                    h1 { (doc.title) }
                    p class="summary t-lead" { (doc.summary) }
                    (PreEscaped(&doc.html))
                }

                nav class="pager" aria-label="Pagination" {
                    @if let Some(prev) = prev {
                        a class="pager__link" href=(ctx.url(&format!("docs/{}", prev.slug))) {
                            span class="pager__dir t-label" { "Previous" }
                            span class="pager__title t-ui" { (prev.title) }
                        }
                    } @else {
                        span {}
                    }
                    @if let Some(next) = next {
                        a class="pager__link pager__link--next"
                          href=(ctx.url(&format!("docs/{}", next.slug))) {
                            span class="pager__dir t-label" { "Next" }
                            span class="pager__title t-ui" { (next.title) }
                        }
                    }
                }
            }
        }
    };

    layout::render(
        ctx,
        Page {
            title: &format!("{} — namesync", doc.title),
            description: &doc.summary,
            section: "docs",
            body,
        },
    )
}
