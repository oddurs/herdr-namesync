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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_built_url_carries_the_base() {
        let ctx = Ctx::build("/herdr-namesync");
        assert_eq!(ctx.url("docs/install"), "/herdr-namesync/docs/install");
        assert_eq!(ctx.url("/docs/install"), "/herdr-namesync/docs/install");
        assert_eq!(ctx.url(""), "/herdr-namesync/");
    }

    #[test]
    fn a_trailing_slash_on_the_base_is_not_doubled() {
        assert_eq!(
            Ctx::build("/herdr-namesync/").url("styles.css"),
            "/herdr-namesync/styles.css"
        );
    }

    #[test]
    fn served_urls_are_root_relative() {
        let ctx = Ctx::serve();
        assert_eq!(ctx.url("docs/install"), "/docs/install");
        assert_eq!(ctx.url(""), "/");
    }

    #[test]
    fn only_the_served_page_carries_the_reload_listener() {
        assert!(Ctx::serve().live);
        assert!(!Ctx::build("/herdr-namesync").live);
    }
}
