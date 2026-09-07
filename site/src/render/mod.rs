//! Templates.
//!
//! maud rather than a template-file engine: the markup is a macro, so it is
//! checked when the crate is compiled. A mistyped tag or an unclosed element
//! is a build error rather than a page that renders a blank region and says
//! nothing about why.

pub mod doc;
pub mod home;
pub mod layout;
pub mod logo;
pub mod workspaces;

/// Everything a template needs that is not its own content.
#[derive(Debug, Clone)]
pub struct Ctx {
    /// Path the site is served under, without a trailing slash. Empty when
    /// served from the root, which is how the live server runs.
    pub base: String,
    /// Whether to inject the reload listener. Never true in a built page.
    pub live: bool,
}

impl Ctx {
    pub fn build(base: &str) -> Self {
        Self {
            base: base.trim_end_matches('/').to_string(),
            live: false,
        }
    }

    pub fn serve() -> Self {
        Self {
            base: String::new(),
            live: true,
        }
    }

    /// Project pages serve from a subpath, so an absolute link written as
    /// `/docs/install` would 404 there while working locally. Every internal
    /// link goes through here.
    pub fn url(&self, path: &str) -> String {
        format!("{}/{}", self.base, path.trim_start_matches('/'))
    }
}
