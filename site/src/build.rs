//! Static output, for a host that serves files and nothing else.

use crate::render::Ctx;
use crate::site::Site;
use anyhow::{Context, Result};
use std::path::Path;

fn write(path: &Path, contents: &str) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("creating {}", parent.display()))?;
    }
    std::fs::write(path, contents).with_context(|| format!("writing {}", path.display()))
}

/// Copies `public/` verbatim. Favicons and anything else that is already the
/// shape it needs to be.
fn copy_public(from: &Path, to: &Path) -> Result<usize> {
    if !from.exists() {
        return Ok(0);
    }
    let mut copied = 0;
    for entry in std::fs::read_dir(from)? {
        let path = entry?.path();
        if path.is_file() {
            let dest = to.join(path.file_name().expect("read_dir yields named entries"));
            std::fs::create_dir_all(to)?;
            std::fs::copy(&path, &dest).with_context(|| format!("copying {}", path.display()))?;
            copied += 1;
        }
    }
    Ok(copied)
}

pub fn run(root: &Path, out: &Path, base: &str) -> Result<()> {
    let site = Site::load(root)?;
    let ctx = Ctx::build(base);

    if out.exists() {
        std::fs::remove_dir_all(out).with_context(|| format!("clearing {}", out.display()))?;
    }

    write(&out.join("index.html"), &site.home(&ctx))?;
    write(&out.join("styles.css"), &site.styles)?;

    for doc in &site.docs {
        let html = site
            .doc(&ctx, &doc.slug)
            .expect("slug came from the collection");
        // Directory indexes, so `/docs/install` resolves without a redirect
        // and without depending on the host's extension guessing.
        write(&out.join("docs").join(&doc.slug).join("index.html"), &html)?;
    }

    // `/docs` itself is not a page. Static hosts have no redirects, so this is
    // the one place a meta refresh is the honest tool.
    let first = site.first_doc();
    let target = ctx.url(&format!("docs/{}", first.slug));
    write(
        &out.join("docs").join("index.html"),
        &format!(
            "<!doctype html><meta charset=utf-8>\
             <meta http-equiv=refresh content=\"0; url={target}\">\
             <link rel=canonical href=\"{target}\">\
             <title>Documentation — namesync</title>\
             <a href=\"{target}\">Documentation</a>"
        ),
    )?;

    let assets = copy_public(&root.join("public"), out)?;

    println!(
        "built {} page(s) and {} asset(s) into {}",
        site.docs.len() + 2,
        assets,
        out.display()
    );
    Ok(())
}
