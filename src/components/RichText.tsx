import { Fragment } from 'react';
import { type Inline, parseRich } from './speechMarkdown';

function Line({ parts }: { parts: Inline[] }) {
  return parts.map((s, k) =>
    s.kind === 'strong' ? (
      <strong key={k} className="rt-mark">
        {s.text}
      </strong>
    ) : s.kind === 'em' ? (
      <em key={k}>{s.text}</em>
    ) : (
      <Fragment key={k}>{s.text}</Fragment>
    ),
  );
}

export function RichText({ text }: { text: string }) {
  return parseRich(text).map((b, i) => {
    if (b.kind === 'list') {
      const List = b.ordered ? 'ol' : 'ul';
      return (
        <List key={i} className="rt-list">
          {b.items.map((item, j) => (
            <li key={j}>
              <Line parts={item} />
            </li>
          ))}
        </List>
      );
    }
    if (b.kind === 'heading')
      return (
        <p key={i} className="rt-heading">
          <Line parts={b.line} />
        </p>
      );
    return (
      <p key={i}>
        {b.lines.map((line, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            <Line parts={line} />
          </Fragment>
        ))}
      </p>
    );
  });
}
