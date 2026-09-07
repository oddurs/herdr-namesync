//! Markdown, and code highlighted without a browser.
//!
//! Shiki ran at build time under Node and emitted inline `style="color:var(…)"`
//! on every token. syntect emits classes instead, which is smaller on the wire
//! and leaves the palette in CSS where the rest of the site's colour lives --
//! so a token can be restyled without re-rendering the site.
//!
//! Classes are prefixed. Sublime's scope names are words like `comment`,
//! `string` and `constant`, and unprefixed they would collide with the site's
//! own classes the first time either side added one.

use anyhow::{Context, Result};
use pulldown_cmark::{CodeBlockKind, Event, Options, Parser, Tag, TagEnd};
use std::sync::OnceLock;
use syntect::html::{ClassStyle, ClassedHTMLGenerator};
use syntect::parsing::SyntaxSet;
use syntect::util::LinesWithEndings;

const CLASS_STYLE: ClassStyle = ClassStyle::SpacedPrefixed { prefix: "tok-" };

fn syntaxes() -> &'static SyntaxSet {
    static SYNTAXES: OnceLock<SyntaxSet> = OnceLock::new();
    SYNTAXES.get_or_init(SyntaxSet::load_defaults_newlines)
}

/// Languages the documents actually fence with, mapped to what syntect calls
/// them. An unknown language is not an error -- it renders unhighlighted, the
/// way a plain fence does, because a code block nobody coloured is still a
/// perfectly readable code block.
fn syntax_for(lang: &str) -> Option<&'static syntect::parsing::SyntaxReference> {
    let set = syntaxes();
    let name = match lang {
        "sh" | "shell" | "console" => "bash",
        "js" => "javascript",
        other => other,
    };
    set.find_syntax_by_token(name)
}

fn highlight(code: &str, lang: &str) -> Result<String> {
    let Some(syntax) = syntax_for(lang) else {
        return Ok(maud::html! { code { (code) } }.into_string());
    };

    let mut generator = ClassedHTMLGenerator::new_with_class_style(syntax, syntaxes(), CLASS_STYLE);
    for line in LinesWithEndings::from(code) {
        generator
            .parse_html_for_line_which_includes_newline(line)
            .with_context(|| format!("highlighting a `{lang}` block"))?;
    }

    Ok(format!("<code>{}</code>", generator.finalize()))
}

/// CommonMark to HTML, with fenced code highlighted on the way through.
pub fn render(source: &str) -> Result<String> {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_FOOTNOTES);
    // Typographic quotes and dashes. The prose is written with them in mind:
    // the source says `--` and the page should say an em dash.
    options.insert(Options::ENABLE_SMART_PUNCTUATION);

    let mut out = String::with_capacity(source.len() * 2);
    let mut events = Vec::new();
    let mut code: Option<(String, String)> = None;

    for event in Parser::new_ext(source, options) {
        match event {
            Event::Start(Tag::CodeBlock(kind)) => {
                let lang = match &kind {
                    CodeBlockKind::Fenced(info) => info
                        .split_whitespace()
                        .next()
                        .unwrap_or_default()
                        .to_string(),
                    CodeBlockKind::Indented => String::new(),
                };
                code = Some((lang, String::new()));
            }
            Event::Text(text) if code.is_some() => {
                code.as_mut().expect("checked").1.push_str(&text);
            }
            Event::End(TagEnd::CodeBlock) => {
                let (lang, body) = code.take().unwrap_or_default();
                let inner = highlight(&body, &lang)?;
                events.push(Event::Html(format!("<pre>{inner}</pre>").into()));
            }
            other => events.push(other),
        }
    }

    pulldown_cmark::html::push_html(&mut out, events.into_iter());
    Ok(out)
}
