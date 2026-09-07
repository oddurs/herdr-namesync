//! Everything the renderer needs, loaded once.
//!
//! Both modes build one of these. The live server rebuilds it on change and
//! the static build makes one and walks it, so the served page and the written
//! page come out of the same code and cannot drift.

use crate::{
    content::{self, Doc},
    markdown,
    render::{Ctx, doc, home},
};
use anyhow::{Context, Result};
use std::path::Path;

/// Layer order is load-bearing: a later sheet may override an earlier one, and
/// concatenating in this order is what lets it without a selector arms race.
const STYLES: &[&str] = &[
    "tokens.css",
    "base.css",
    "type.css",
    "prose.css",
    "code.css",
    "app.css",
    "logo.css",
    "workspaces.css",
    "home.css",
    "docs.css",
];

pub struct Site {
    pub docs: Vec<Doc>,
    pub styles: String,
}

impl Site {
    pub fn load(root: &Path) -> Result<Self> {
        let docs = content::load(&root.join("content/docs"), markdown::render)?;

        let mut styles = String::new();
        for name in STYLES {
            let path = root.join("styles").join(name);
            let sheet = std::fs::read_to_string(&path)
                .with_context(|| format!("reading {}", path.display()))?;
            styles.push_str(&sheet);
            styles.push('\n');
        }

        Ok(Self { docs, styles })
    }

    pub fn home(&self, ctx: &Ctx) -> String {
        home::render(ctx).into_string()
    }

    pub fn doc(&self, ctx: &Ctx, slug: &str) -> Option<String> {
        let i = self.docs.iter().position(|d| d.slug == slug)?;
        Some(doc::render(ctx, &self.docs, i).into_string())
    }

    /// The first document. `/docs` is not a page of its own; it is where the
    /// reader starts.
    pub fn first_doc(&self) -> &Doc {
        self.docs
            .first()
            .expect("content::load rejects an empty collection")
    }
}
