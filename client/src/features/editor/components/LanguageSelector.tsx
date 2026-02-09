import './LanguageSelector.scss';

const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Ruby', 'Rust', 'Go',
  'Java', 'C#', 'C++', 'C', 'SQL', 'PHP', 'HTML', 'CSS',
];

interface LanguageSelectorProps {
  value: string;
  onChange: (language: string) => void;
}

export default function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <select
      className="LanguageSelector"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {LANGUAGES.map(lang => (
        <option key={lang} value={lang.toLowerCase()}>
          {lang}
        </option>
      ))}
    </select>
  );
}
