//! The live server.
//!
//! Renders on request rather than serving a directory, so what you see is the
//! renderer's current output with no build step in between. A watcher on the
//! content, styles and templates bumps a version; the page holds an SSE
//! connection and reloads when it moves.
//!
//! Development only. Production is static, which is what keeps the two paths
//! honest -- both go through `Site`, so a page cannot render one way here and
//! another way in `dist/`.

use crate::render::Ctx;
use crate::site::Site;
use anyhow::{Context, Result};
use axum::Router;
use axum::extract::{Path as UrlPath, State};
use axum::http::{StatusCode, header};
use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::{Html, IntoResponse, Redirect, Response};
use axum::routing::get;
use notify::{RecursiveMode, Watcher};
use std::convert::Infallible;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::watch;
use tokio_stream::StreamExt;
use tokio_stream::wrappers::WatchStream;

struct App {
    root: PathBuf,
    /// Rebuilt on every request. The site is small enough that rendering it
    /// per request is cheaper than the bookkeeping to avoid it -- and it means
    /// a syntax error in a document shows up as a message in the browser
    /// rather than a stale page that looks fine.
    changed: watch::Receiver<u64>,
}

impl App {
    fn site(&self) -> Result<Site> {
        Site::load(&self.root)
    }
}

/// A failure renders as the page, because the alternative during development
/// is a blank tab and a guess about which file broke.
fn oops(err: anyhow::Error) -> Response {
    let body = format!(
        "<!doctype html><meta charset=utf-8><title>namesync — build error</title>\
         <body style=\"background:#0a0f14;color:#e7f3f2;font:14px/1.6 ui-monospace,monospace;padding:2rem\">\
         <h1 style=\"font-size:1rem;color:#d26939\">Could not render the site</h1>\
         <pre style=\"white-space:pre-wrap\">{err:#}</pre>\
         <script>new EventSource(\"/_live\").onmessage=()=>location.reload()</script>"
    );
    (StatusCode::INTERNAL_SERVER_ERROR, Html(body)).into_response()
}

async fn home(State(app): State<Arc<App>>) -> Response {
    match app.site() {
        Ok(site) => Html(site.home(&Ctx::serve())).into_response(),
        Err(err) => oops(err),
    }
}

async fn styles(State(app): State<Arc<App>>) -> Response {
    match app.site() {
        Ok(site) => (
            [(header::CONTENT_TYPE, "text/css; charset=utf-8")],
            site.styles,
        )
            .into_response(),
        Err(err) => oops(err),
    }
}

async fn doc(State(app): State<Arc<App>>, UrlPath(slug): UrlPath<String>) -> Response {
    let site = match app.site() {
        Ok(site) => site,
        Err(err) => return oops(err),
    };
    let slug = slug.trim_end_matches('/');
    match site.doc(&Ctx::serve(), slug) {
        Some(html) => Html(html).into_response(),
        None => (StatusCode::NOT_FOUND, Html(format!(
            "<!doctype html><meta charset=utf-8>\
             <body style=\"background:#0a0f14;color:#e7f3f2;font:14px/1.6 ui-monospace,monospace;padding:2rem\">\
             no document called <b>{slug}</b>"
        )))
            .into_response(),
    }
}

async fn docs_index(State(app): State<Arc<App>>) -> Response {
    match app.site() {
        Ok(site) => {
            Redirect::temporary(&format!("/docs/{}", site.first_doc().slug)).into_response()
        }
        Err(err) => oops(err),
    }
}

/// One event per change. The browser reloads; nothing is diffed, because a
/// full reload of a page this size is faster than deciding what moved.
async fn live(
    State(app): State<Arc<App>>,
) -> Sse<impl StreamExt<Item = Result<Event, Infallible>>> {
    let stream = WatchStream::new(app.changed.clone())
        .skip(1)
        .map(|version| Ok(Event::default().data(version.to_string())));

    Sse::new(stream).keep_alive(KeepAlive::default())
}

fn watch(root: &Path, tx: watch::Sender<u64>) -> Result<notify::RecommendedWatcher> {
    let mut watcher = notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
        let Ok(event) = event else { return };
        // Editors write atomically by renaming a temp file in, so create and
        // remove count as changes alongside the obvious one.
        if event.kind.is_access() {
            return;
        }
        tx.send_modify(|version| *version += 1);
    })?;

    for dir in ["content", "styles", "public"] {
        let path = root.join(dir);
        if path.exists() {
            watcher
                .watch(&path, RecursiveMode::Recursive)
                .with_context(|| format!("watching {}", path.display()))?;
        }
    }

    Ok(watcher)
}

pub async fn run(root: &Path, port: u16) -> Result<()> {
    // Fail loudly before binding a port, rather than serving an error page to
    // somebody who has not opened a browser yet.
    Site::load(root).context("the site does not currently render")?;

    let (tx, rx) = watch::channel(0);
    // Held for the lifetime of the server: dropping a notify watcher stops it.
    let _watcher = watch(root, tx)?;

    let app = Arc::new(App {
        root: root.to_path_buf(),
        changed: rx,
    });

    let router = Router::new()
        .route("/", get(home))
        .route("/styles.css", get(styles))
        .route("/docs", get(docs_index))
        .route("/docs/", get(docs_index))
        .route("/docs/{slug}", get(doc))
        .route("/_live", get(live))
        .fallback_service(tower_http::services::ServeDir::new(root.join("public")))
        .layer(tower_http::compression::CompressionLayer::new())
        .with_state(app);

    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .with_context(|| format!("binding {addr} — is something already on port {port}?"))?;

    println!("namesync site on http://{addr}  (live reload on)");

    axum::serve(listener, router)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
            println!("\nstopped");
        })
        .await
        .context("serving")?;

    Ok(())
}
