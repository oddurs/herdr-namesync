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

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    /// Frontmatter is the one place a document can be wrong in a way that
    /// produces a page rather than an error, so every rejection is tested.
    fn parse(source: &str) -> Result<(BTreeMap<String, String>, String)> {
        split_frontmatter(source, Path::new("test.md"))
    }

    #[test]
    fn reads_fields_and_body() {
        let (fields, body) = parse("---\ntitle: Install\norder: 1\n---\nBody.\n").unwrap();
        assert_eq!(fields["title"], "Install");
        assert_eq!(fields["order"], "1");
        assert_eq!(body, "Body.\n");
    }

    #[test]
    fn a_summary_may_contain_punctuation() {
        // Split on the first colon only: a summary is prose and prose has
        // colons in it.
        let (fields, _) = parse("---\nsummary: Two things: this, and that.\n---\n").unwrap();
        assert_eq!(fields["summary"], "Two things: this, and that.");
    }

    #[test]
    fn rejects_a_document_with_no_frontmatter() {
        assert!(parse("# Just a heading\n").is_err());
    }

    #[test]
    fn rejects_frontmatter_that_is_never_closed() {
        assert!(parse("---\ntitle: Install\n").is_err());
    }

    #[test]
    fn rejects_a_line_that_is_not_a_field() {
        let err = parse("---\ntitle: Install\nnonsense\n---\n")
            .unwrap_err()
            .to_string();
        assert!(err.contains("expected `key: value`"), "{err}");
    }

    struct Dir(PathBuf);

    impl Dir {
        fn new(name: &str) -> Self {
            let path =
                std::env::temp_dir().join(format!("ns-content-{name}-{}", std::process::id()));
            let _ = std::fs::remove_dir_all(&path);
            std::fs::create_dir_all(&path).expect("temp dir");
            Self(path)
        }

        fn doc(&self, slug: &str, title: &str, order: u32) -> &Self {
            std::fs::write(
                self.0.join(format!("{slug}.md")),
                format!("---\ntitle: {title}\nsummary: A summary.\norder: {order}\n---\nBody.\n"),
            )
            .expect("write");
            self
        }

        fn load(&self) -> Result<Vec<Doc>> {
            super::load(&self.0, |body| Ok(body.to_string()))
        }
    }

    impl Drop for Dir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn orders_by_order_not_by_filename() {
        let dir = Dir::new("order");
        dir.doc("aaa", "Last", 2).doc("zzz", "First", 1);
        let docs = dir.load().unwrap();
        assert_eq!(
            docs.iter().map(|d| d.slug.as_str()).collect::<Vec<_>>(),
            ["zzz", "aaa"]
        );
    }

    #[test]
    fn rejects_a_duplicate_order() {
        // The bug this validation exists for: Astro broke the tie on whatever
        // the filesystem returned first, so the sidebar and the pager silently
        // disagreed with the author.
        let dir = Dir::new("dupe");
        dir.doc("internals", "Internals", 6)
            .doc("sources", "Sources", 6);
        let err = dir.load().unwrap_err().to_string();
        assert!(err.contains("both declare order 6"), "{err}");
    }

    #[test]
    fn rejects_a_missing_field() {
        let dir = Dir::new("missing");
        std::fs::write(dir.0.join("a.md"), "---\ntitle: A\norder: 1\n---\n").unwrap();
        let err = dir.load().unwrap_err().to_string();
        assert!(err.contains("missing `summary`"), "{err}");
    }

    #[test]
    fn rejects_an_order_that_is_not_a_number() {
        let dir = Dir::new("nan");
        std::fs::write(
            dir.0.join("a.md"),
            "---\ntitle: A\nsummary: S.\norder: first\n---\n",
        )
        .unwrap();
        assert!(dir.load().is_err());
    }

    #[test]
    fn rejects_an_empty_collection() {
        let dir = Dir::new("empty");
        assert!(dir.load().is_err());
    }
}
