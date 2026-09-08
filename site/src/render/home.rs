//! The landing page.
//!
//! Seven sections, and no two adjacent ones share a form: mock, table,
//! terminal, definition list, two-column split, quiet prose, code. The page
//! spent a while as one visual and four screens of prose, and the rhythm is
//! the fix for that rather than a decoration on it.

use super::layout::{self, Page};
use super::{Ctx, workspaces};
use maud::{Markup, html};

pub const TITLE: &str = "namesync — terminal workspaces named after what you’re doing";
pub const DESCRIPTION: &str = "A herdr plugin that keeps workspace, tab and agent names in step \
    with the work as it changes — and knows when to leave them alone. Works with no model; can \
    use one when you want.";

struct Rival {
    name: &'static str,
    href: &'static str,
    what: Markup,
    theirs: &'static str,
    ours: &'static str,
}

fn rivals() -> Vec<Rival> {
    vec![
        Rival {
            name: "herdr-automatic-rename",
            href: "https://github.com/qu8n/herdr-automatic-rename",
            what: html! {
                "names every pane — " code { "api › feat/oauth › nvim" }
                " — numbers them, and fires the instant a command starts"
            },
            theirs: "You want your shells, ssh sessions and editors named too, not only your agents",
            ours: "Only the agent panes matter, and their names have to keep up with a session that \
                   changes subject",
        },
        Rival {
            name: "herdr-plugin-renamer",
            href: "https://github.com/wyattjoh/herdr-plugin-renamer",
            what: html! {
                "names from the agent’s first prompt, renames the worktree’s branch too, and runs \
                 on-device"
            },
            theirs: "One session, one task — and you want the branch renamed, with nothing leaving \
                     the machine",
            ours: "A session that runs all day, where the first prompt stopped describing it hours \
                   ago",
        },
        Rival {
            name: "herdr-tab-smart-rename",
            href: "https://github.com/iurysza/herdr-tab-smart-rename",
            what: html! {
                "names known commands for free, asks a model about the rest, and reuses a provider \
                 you have already connected"
            },
            theirs: "You want a model interpreting work the agent has not described itself",
            ours: "The agent is already describing its own work, and you want something deciding \
                   when to believe it",
        },
    ]
}

const RULES: &[(&str, &str)] = &[
    (
        "Your names win",
        "A label that isn’t the one namesync last wrote was written by you. It gets locked and is \
      never touched again.",
    ),
    (
        "Defaults are fair game",
        "bedreader, w3, tab 2, empty. Nobody chose these, so namesync claims them.",
    ),
    (
        "Rewording isn’t new intent",
        "“naming plugin” to “naming plugins” scores 1.00 on a stemmed token overlap and is skipped, \
      so the sidebar doesn’t flicker.",
    ),
    (
        "It waits for you to settle",
        "Titles churn early in a turn. A rename holds for a debounce window, then at most once per \
      workspace per interval.",
    ),
    (
        "It stays quiet when you’re stuck",
        "While an agent waits on an approval dialog its title describes the question, not the work. \
      namesync sits that out and retries.",
    ),
    (
        "It won’t guess",
        "A workspace holding two agents has no single intent, so its tabs get named instead and the \
      space is left alone.",
    ),
];

pub fn render(ctx: &Ctx) -> Markup {
    let body = html! {
        main {
            section class="hero" {
                div class="hero__copy" {
                    h1 class="hero__title t-display" {
                        "The agent knows what it is working on."
                        em { "Your sidebar doesn’t." }
                    }
                    p class="hero__lede t-lead" {
                        "The agent inside each space has been describing its own work the entire \
                         time. namesync moves that description onto the space — leaving anything \
                         you named yourself alone — and keeps it current as the work changes."
                    }

                    div class="hero__start" {
                        pre class="hero__cmd t-code" {
                            code { "herdr plugin install oddurs/herdr-namesync" }
                        }
                        p class="hero__links t-ui" {
                            a href=(ctx.url("docs/install")) { "Read the docs" }
                            a href="https://github.com/oddurs/herdr-namesync" { "Source" }
                        }
                    }
                }

                div class="hero__demo" { (workspaces::panel()) }
            }

            section class="band" {
                div class="band__inner prose" {
                    h2 class="band__heading" { "Why another renamer" }
                    p {
                        "herdr’s marketplace lists twenty-three plugins that rename things. Almost \
                         all of them name a session once, from its first prompt, and never revise \
                         it. That is correct for about ten minutes; by the afternoon the label \
                         describes work that finished before lunch."
                    }
                    p {
                        "That is the problem this plugin was built for, rather than a variation on \
                         it. Three are worth naming, because each is better than namesync at \
                         something:"
                    }

                    table class="compare" {
                        thead {
                            tr {
                                th scope="col" { "Instead of" }
                                th scope="col" { "Better when" }
                                th scope="col" { "namesync when" }
                            }
                        }
                        tbody {
                            @for rival in rivals() {
                                tr {
                                    th scope="row" {
                                        a href=(rival.href) { (rival.name) }
                                        span { (rival.what) }
                                    }
                                    td { (rival.theirs) }
                                    td { (rival.ours) }
                                }
                            }
                        }
                    }

                    p {
                        "All three protect a name you wrote by hand, so that is not the \
                         distinction. It is that namesync moves a name rather than composing one, \
                         and that something decides "
                        em { "when it should change" }
                        " — a debounce, a rate limit, a similarity gate, a staleness signal, \
                         silence while you are mid-dialog — with "
                        code { "dry-run" }
                        " printing the reason behind every decision it makes and every one it \
                         declines."
                    }
                }
            }

            section class="band band--rule" {
                div class="band__inner prose" {
                    h2 class="band__heading" { "Nothing generates the name, unless you ask it to" }
                    p {
                        "The work is usually already done. Claude Code, Codex and the rest publish \
                         a running summary of the current task as their terminal title, and herdr \
                         already captures it. Ask it yourself:"
                    }
                    pre { code {
"$ herdr agent list | jq -r '.result.agents[].terminal_title_stripped'
Astro docs site GNU style
Richard Stallman perspective
Open source wifi e-reader" } }
                    p {
                        "Free, instant, and it works for every agent kind herdr recognises. That \
                         is the default, and it needs no model, no key and no account."
                    }
                    p {
                        "Its one weakness is that agents set a title early and rarely revise it. \
                         When a title goes stale namesync notices, and can fall back to a model \
                         you configure — off unless you set an endpoint, consulted only once the \
                         free answer has demonstrably failed, and held to exactly the same rules \
                         as any other name. Being expensive buys a name no authority here."
                    }
                    p {
                        "That fallback sends the pane’s visible contents and your recent prompts \
                         to whatever endpoint you point it at, unattended, on a timer. A model on \
                         your own machine keeps that on your machine; a hosted one is a third \
                         party reading your screen. "
                        a href=(ctx.url("docs/sources")) { "What it sends" }
                        ", in full."
                    }
                }
            }

            section class="band band--rule" {
                div class="band__inner prose" {
                    h2 class="band__heading" { "When it renames" }
                    p {
                        "herdr emits an event when a pane’s title changes, and deliberately not \
                         when only the spinner moved. That event is the trigger. Everything after \
                         it is the part that decides whether to act."
                    }

                    dl class="rules" {
                        @for (term, meaning) in RULES {
                            div class="rules__row" {
                                dt { (term) }
                                dd { (meaning) }
                            }
                        }
                    }

                    p {
                        code { "namesync dry-run" }
                        " prints every decision and the reason behind it, and changes nothing. It \
                         is the right place to start."
                    }
                }
            }

            section class="band band--rule" {
                div class="band__inner prose" {
                    h2 class="band__heading" { "One title, two names" }
                    p {
                        "herdr has two naming surfaces and they want opposite things. An agent \
                         name is an identifier — herdr requires "
                        code { "[a-z][a-z0-9_-]{0,31}" }
                        " and no two live agents sharing one. A space label is prose. So the same \
                         intent lands as two different strings:"
                    }

                    dl class="split" {
                        div class="split__from" {
                            dt { "the agent’s title" }
                            dd { code { "app-fix-the-auth-flow" } }
                        }
                        div class="split__row" {
                            dt { "agent" }
                            dd {
                                code { "app-fix-the-auth-flow" }
                                span { "an identifier, kept as one" }
                            }
                        }
                        div class="split__row" {
                            dt { "space" }
                            dd {
                                code { "Fix the auth flow" }
                                span { "prose — and the line above it already says " em { "app" } }
                            }
                        }
                    }

                    p {
                        "A title that arrives already slug-shaped is read as prose on the surfaces \
                         that want prose, so the sidebar never ends up with a hyphenated \
                         identifier wearing a capital letter. One hyphen never triggers it: "
                        code { "well-known" } " and " code { "read-only" } " are words, not slugs."
                    }
                }
            }

            section class="band band--rule" {
                div class="band__inner prose quiet" {
                    h2 class="band__heading" { "What it will not do" }
                    p {
                        "namesync moves a name that already exists. It does not write one, so it \
                         inherits whatever the agent publishes — and agents set a title early and \
                         often never revise it. When that happens the space is named after work \
                         that finished hours ago, and namesync is mirroring faithfully. Lowering "
                        code { "similarityThreshold" }
                        " will not help, because nothing upstream changed. It can only tell you: \
                         that is what " code { "$stale" } " is for."
                    }
                    p {
                        "herdr can send a prompt to a running agent. namesync could therefore ask \
                         one what it is working on and get a perfect answer every time. It does \
                         not, and it will not — that writes into your conversation, spends your \
                         tokens and pollutes the transcript, to fix what is ultimately a cosmetic \
                         problem."
                    }
                }
            }

            section class="band band--rule" {
                div class="band__inner prose" {
                    h2 class="band__heading" { "Install" }
                    pre { code {
"herdr plugin install oddurs/herdr-namesync
namesync setup --write            # add the sidebar rows herdr needs
herdr integration install claude  # sharper agent state detection" } }
                    p {
                        "The middle step is the one that catches people out. namesync publishes "
                        code { "$project" } ", " code { "$branch" } ", " code { "$since" } " and "
                        code { "$n" } ", but herdr renders none of them until the sidebar asks — \
                         and " code { "herdr config" } " has no " code { "set" } " for a plugin to \
                         do it with. Without it you install namesync and nothing visible changes."
                    }
                    p {
                        code { "setup" } " prints the rows and writes nothing without "
                        code { "--write" } ", backs up your config first, and refuses outright if \
                         you already have a sidebar layout. What it adds is fenced, so "
                        code { "namesync setup --undo" } " takes it back byte for byte."
                    }
                    p { "Then look before you leap:" }
                    pre { code { "namesync dry-run" } }
                    p {
                        "Every decision it would make against your live session, with the reason \
                         for each, and nothing changed. herdr 0.8 or newer, Node 18 or newer, no \
                         npm dependencies."
                    }
                    p { a href=(ctx.url("docs/install")) { "Read the docs" } }
                }
            }
        }
    };

    layout::render(
        ctx,
        Page {
            title: TITLE,
            description: DESCRIPTION,
            section: "home",
            body,
        },
    )
}
