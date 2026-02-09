import { useState } from 'react';
import CodeEditor from './CodeEditor';
import LanguageSelector from './LanguageSelector';
import Button from '../../../components/shared/Button';
import './CodePanel.scss';

interface CodePanelProps {
  language?: string;
  starterCode?: string;
  onSubmit: (code: string, language: string) => void;
  submitting?: boolean;
}

export default function CodePanel({ language: initialLang = 'javascript', starterCode = '', onSubmit, submitting }: CodePanelProps) {
  const [code, setCode] = useState(starterCode);
  const [language, setLanguage] = useState(initialLang);

  return (
    <div className="CodePanel">
      <div className="CodePanel__toolbar">
        <LanguageSelector value={language} onChange={setLanguage} />
        <Button
          size="sm"
          onClick={() => onSubmit(code, language)}
          loading={submitting}
          disabled={!code.trim()}
        >
          Submit Solution
        </Button>
      </div>
      <div className="CodePanel__editor">
        <CodeEditor
          value={code}
          onChange={setCode}
          language={language}
        />
      </div>
    </div>
  );
}
