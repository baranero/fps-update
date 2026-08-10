import { Link } from "@/i18n/navigation";
import type { KbBlock } from "@/lib/content/kb";

// Renderer treści bazy wiedzy FDSRun. Odpowiednik components/Blog/ArticlePage
// dla witryny usługowej, ale na tokenach chmury (canvas/panel/ink/hairline) i
// z blokiem `code` — bez niego nie da się pisać o wsadach FDS.
//
// Komponent serwerowy: treść jest statyczna, nic tu nie potrzebuje interakcji.

/** Znaczniki inline: `kod` w grawisach i **pogrubienie**. */
function inline(text: string): React.ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={i}
          className="rounded-chip border border-hairline bg-panel-deep px-1.5 py-0.5 font-mono text-[0.9em] text-ink"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function Block({ block }: { block: KbBlock }) {
  switch (block.type) {
    case "h":
      return (
        <div className="pt-6">
          {block.n && <span className="font-mono text-fr-micro uppercase text-primary">{block.n}</span>}
          <h2 className="mt-1 font-heading text-fr-h2 text-ink">{block.text}</h2>
        </div>
      );

    case "p":
      return <p className="text-fr-lead leading-relaxed text-muted">{inline(block.text)}</p>;

    case "list": {
      const items = block.items.map((it, i) => (
        <li key={i} className="flex gap-3 text-fr-body leading-relaxed text-muted">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
          <span>{inline(it)}</span>
        </li>
      ));
      const ordered = block.items.map((it, i) => (
        <li key={i} className="flex gap-3 text-fr-body leading-relaxed text-muted">
          <span className="mt-0.5 shrink-0 font-mono text-fr-micro text-primary">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>{inline(it)}</span>
        </li>
      ));
      return block.ordered ? (
        <ol className="space-y-3">{ordered}</ol>
      ) : (
        <ul className="space-y-3">{items}</ul>
      );
    }

    case "code":
      return (
        <figure className="overflow-hidden rounded-panel border border-hairline bg-well">
          <pre className="overflow-x-auto p-5 font-mono text-fr-sm leading-relaxed text-ink">
            <code>{block.text}</code>
          </pre>
          {block.caption && (
            <figcaption className="border-t border-hairline px-5 py-2.5 font-mono text-fr-micro uppercase text-faint">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "note":
      return (
        <aside className="rounded-panel border-l-2 border-primary bg-primary/[0.06] p-5">
          {block.title && (
            <p className="mb-1.5 font-mono text-fr-micro uppercase text-primary">{block.title}</p>
          )}
          <p className="text-fr-body leading-relaxed text-ink">{inline(block.text)}</p>
        </aside>
      );

    case "table":
      return (
        <figure className="overflow-hidden rounded-panel border border-hairline bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline">
                  {block.head.map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 font-mono text-fr-micro uppercase text-faint"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={i} className="border-b border-hairline-soft last:border-0">
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={`whitespace-nowrap px-4 py-3 text-fr-sm ${
                          j === 0 ? "font-medium text-ink" : "font-mono text-muted"
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.caption && (
            <figcaption className="border-t border-hairline px-4 py-2.5 font-mono text-fr-micro uppercase text-faint">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "cta":
      return (
        <div className="rounded-card border border-hairline bg-panel p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <p className="text-fr-body text-muted">{block.text}</p>
          <Link
            href={block.href}
            className="mt-4 inline-flex shrink-0 rounded-panel bg-primary px-5 py-2.5 text-fr-body font-bold text-white transition-opacity hover:opacity-90 sm:mt-0"
          >
            {block.linkText}
          </Link>
        </div>
      );

    default:
      return null;
  }
}

export default function PostBody({ blocks }: { blocks: KbBlock[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </div>
  );
}
