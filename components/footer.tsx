/**
 * Submission requirement: name, GitHub and LinkedIn in the footer.
 * Replace the placeholders below with your real details before submitting.
 */
export const AUTHOR = {
  name: "Jana",
  github: "https://github.com/jana-1729",
  linkedin: "https://www.linkedin.com/in/janarthanan-s-6731a5214/",
};

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33 0-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/60 py-4 px-6 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
        <p>
          Built by{" "}
          <span className="font-medium text-foreground">{AUTHOR.name}</span>
        </p>
        <nav className="flex items-center gap-4" aria-label="Author links">
          <a
            href={AUTHOR.github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <GithubIcon className="size-4" /> GitHub
          </a>
          <a
            href={AUTHOR.linkedin}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <LinkedinIcon className="size-4" /> LinkedIn
          </a>
        </nav>
      </div>
    </footer>
  );
}
