//! The herdr-namesync lockup.
//!
//! Mark: two staggered arrows, one out and one back — the ASCII `<-` `->` a
//! terminal person already reads as an exchange. The lower arrow carries the
//! accent because it is the one delivering the new name.
//!
//! Lockup: the mark's stroke is set to match the wordmark's stem weight at the
//! same size, and its optical centre is aligned to the wordmark's x-height
//! rather than to the type's bounding box. Those two things are most of why a
//! lockup reads as drawn rather than assembled.
//!
//! Wordmark: `herdr-namesync`, which is the repository, the install command and
//! what the ecosystem indexes. The prefix is a namespace rather than part of
//! the name, so it is set at body weight in the muted tone and `namesync`
//! carries the semibold — the same way a scoped package reads, and the reason
//! the name still lands on the right half of the word.

use maud::{Markup, html};

/// `size` sets the wordmark; the mark scales from it, so the pair stays locked.
pub fn lockup(size: &str) -> Markup {
    html! {
        span class="lockup" style={ "--lockup-size:" (size) } {
            svg class="lockup__mark" viewBox="0 0 26 20" role="img" aria-label="herdr-namesync" {
                g fill="none" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round" {
                    g class="lockup__out" {
                        path d="M23 6H5" {}
                        path d="M9.5 1.5 5 6l4.5 4.5" {}
                    }
                    g class="lockup__in" {
                        path d="M3 14h18" {}
                        path d="M16.5 9.5 21 14l-4.5 4.5" {}
                    }
                }
            }
            span class="lockup__word" {
                span class="lockup__scope" { "herdr-" }
                "namesync"
            }
        }
    }
}
