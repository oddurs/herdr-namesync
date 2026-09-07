//! The documentation collection.
//!
//! Replaces `astro:content` and its zod schema. Every document declares a
//! title, a summary and an order in YAML frontmatter, and all three are
//! required: a page that renders without a title is worse than a build that
//! refuses to produce one.
//!
//! Orders must also be unique. Astro sorted on a duplicate without complaining,
//! which left the navigation and the prev/next pager in whatever order the
//! filesystem happened to hand over -- stable enough to look deliberate and
//! arbitrary enough to move when a file is renamed.

use anyhow::{Context, Result, anyhow, bail};
use std::collections::BTreeMap;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct Doc {
    /// URL segment, from the filename.
    pub slug: String,
    pub title: String,
    /// One line under the page title. Says what the page is for, plainly.
    pub summary: String,
    /// Controls both sidebar order and prev/next.
    pub order: u32,
    /// Rendered body, without the frontmatter.
    pub html: String,
}

/// Splits `---\n…\n---\n` off the front of a file.
///
/// Hand-rolled rather than pulled from a YAML crate: the schema is three
/// scalar fields, and the error messages a parser this small can give -- which
/// file, which line, what was expected -- are better than a generic one about
/// a mapping node.
fn split_frontmatter(source: &str, file: &Path) -> Result<(BTreeMap<String, String>, String)> {
    let rest = source.strip_prefix("---\n").ok_or_else(|| {
        anyhow!(
            "{}: expected YAML frontmatter opening with `---`",
            file.display()
        )
    })?;

    let end = rest
        .find("\n---\n")
        .ok_or_else(|| anyhow!("{}: frontmatter is never closed with `---`", file.display()))?;

    let (head, body) = rest.split_at(end);
    let body = &body["\n---\n".len()..];

    let mut fields = BTreeMap::new();
    for (i, line) in head.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        let (key, value) = line.split_once(':').ok_or_else(|| {
            anyhow!(
                "{}:{}: expected `key: value`, found `{line}`",
                file.display(),
                i + 2
            )
        })?;
        fields.insert(key.trim().to_string(), value.trim().to_string());
    }

    Ok((fields, body.to_string()))
}

fn required<'a>(fields: &'a BTreeMap<String, String>, key: &str, file: &Path) -> Result<&'a str> {
    fields
        .get(key)
        .map(String::as_str)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| anyhow!("{}: frontmatter is missing `{key}`", file.display()))
}

/// Loads every `*.md` in `dir`, ordered.
pub fn load(dir: &Path, render: impl Fn(&str) -> Result<String>) -> Result<Vec<Doc>> {
    let mut docs = Vec::new();

    let entries = std::fs::read_dir(dir)
        .with_context(|| format!("reading documents from {}", dir.display()))?;

    for entry in entries {
        let path = entry?.path();
        if path.extension().is_none_or(|e| e != "md") {
            continue;
        }

        let source = std::fs::read_to_string(&path)
            .with_context(|| format!("reading {}", path.display()))?;
        let (fields, body) = split_frontmatter(&source, &path)?;

        let order: u32 = required(&fields, "order", &path)?
            .parse()
            .with_context(|| format!("{}: `order` must be a whole number", path.display()))?;

        docs.push(Doc {
            slug: path
                .file_stem()
                .ok_or_else(|| anyhow!("{}: no filename to take a slug from", path.display()))?
                .to_string_lossy()
                .into_owned(),
            title: required(&fields, "title", &path)?.to_string(),
            summary: required(&fields, "summary", &path)?.to_string(),
            order,
            html: render(&body)?,
        });
    }

    if docs.is_empty() {
        bail!("no documents found in {}", dir.display());
    }

    docs.sort_by(|a, b| a.order.cmp(&b.order).then_with(|| a.slug.cmp(&b.slug)));

    // Two documents claiming one position is a silent bug: the pager and the
    // sidebar both read this order, and the tie is broken by whatever the
    // filesystem said first.
    for pair in docs.windows(2) {
        if pair[0].order == pair[1].order {
            bail!(
                "`{}` and `{}` both declare order {} — orders must be unique",
                pair[0].slug,
                pair[1].slug,
                pair[0].order
            );
        }
    }

    Ok(docs)
}
