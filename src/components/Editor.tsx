import * as React from 'react';
import * as monaco from 'monaco-editor';

interface EditorProps {
  defaultLanguage?: string;
  defaultValue?: string;
  theme?: 'vs-dark' | 'light';
}

export const Editor: React.FC<EditorProps> = ({
  defaultLanguage = 'javascript',
  defaultValue = '',
  theme = 'vs-dark'
}) => {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [editor, setEditor] = React.useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  React.useEffect(() => {
    if (editorRef.current) {
      const ed = monaco.editor.create(editorRef.current, {
        value: defaultValue,
        language: defaultLanguage,
        theme: theme,
        automaticLayout: true,
        minimap: { enabled: true },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false
      });
      setEditor(ed);
    }
    
    return () => editor?.dispose();
  }, []);

  return <div ref={editorRef} style={{ width: '100%', height: '100vh' }} />;
}; 