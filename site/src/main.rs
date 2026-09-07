//! The namesync site: one binary that renders it and one that serves it live.
//!
//! It replaced an Astro project, and the reason is not that Astro was doing a
//! bad job. It is that the site is seven documents, three pages and two
//! components, and it was carrying a Node toolchain, a lockfile and a
//! `node_modules` to render them. The output is static either way.

mod build;
mod content;
mod markdown;
mod render;
mod serve;
mod site;

use anyhow::Result;
use clap::{Parser, Subcommand};
use std::path::PathBuf;

/// Where the deployed site lives. GitHub project pages serve from a subpath,
/// which is why every internal link goes through `Ctx::url` rather than being
/// written absolute.
const DEFAULT_BASE: &str = "/herdr-namesync";

#[derive(Parser)]
#[command(
    name = "namesync-site",
    about = "Renders the namesync site, or serves it with live reload",
    version
)]
struct Cli {
    /// The site directory. Defaults to the crate's own, so the commands work
    /// from anywhere in the repository.
    #[arg(long, global = true)]
    root: Option<PathBuf>,

    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Render to static files, for GitHub Pages or any other file host.
    Build {
        /// Output directory. Cleared first.
        #[arg(long, default_value = "dist")]
        out: PathBuf,

        /// Path the site will be served under. Pass an empty string to serve
        /// from a domain root.
        #[arg(long, default_value = DEFAULT_BASE)]
        base: String,
    },

    /// Serve it, rendering on request and reloading the browser on change.
    Serve {
        #[arg(long, short, default_value_t = 4321)]
        port: u16,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let root = cli
        .root
        .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")));

    match cli.command {
        Command::Build { out, base } => {
            let out = if out.is_absolute() {
                out
            } else {
                root.join(out)
            };
            build::run(&root, &out, &base)
        }
        Command::Serve { port } => tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()?
            .block_on(serve::run(&root, port)),
    }
}
