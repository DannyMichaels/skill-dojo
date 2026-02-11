import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { SessionMessage } from '../../types/session.types';
import './MessageBubble.scss';

interface MessageBubbleProps {
  message: SessionMessage;
}

/** Ensure markdown block elements have a blank line before them so they parse correctly. */
function fixMarkdown(text: string): string {
  // Fix musical sharps split across lines: "F\n#" → "F#"
  // Only when the letter is standalone (preceded by space, punctuation, or start of line),
  // NOT when it's part of a word like "Reference".
  let fixed = text.replace(/(?<=^|[\s(,—–\-])([A-Ga-g])\s*\n+\s*#/gm, '$1#');

  // Replace standalone musical sharps with the Unicode sharp symbol (♯).
  // "F#", "C#4", "G#m" etc. — but not "Reference#" or code backtick contexts.
  fixed = fixed.replace(/(?<=^|[\s(,—–\-])([A-Ga-g])#/gm, '$1♯');

  // Ensure real markdown headings have a blank line before them
  fixed = fixed.replace(/([^\n])\n?(#{1,6}\s)/g, '$1\n\n$2');

  return fixed;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`MessageBubble MessageBubble--${message.role}`}>
      <div className="MessageBubble__label">
        {message.role === 'user' ? 'You' : 'Sensei'}
      </div>
      <div className="MessageBubble__content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {fixMarkdown(message.content)}
          </ReactMarkdown>
      </div>
    </div>
  );
}
