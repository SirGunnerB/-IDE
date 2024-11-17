interface Snippet {
  id: string;
  name: string;
  description: string;
  language: string;
  code: string;
  variables: string[];
}

export class SnippetsService {
  private snippets: Map<string, Snippet> = new Map();
  private userSnippetsPath: string;

  constructor() {
    this.userSnippetsPath = path.join(process.env.APPDATA!, 'ai-editor', 'snippets');
  }

  async loadSnippets() {
    const files = await fs.readdir(this.userSnippetsPath);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(this.userSnippetsPath, file), 'utf-8');
        const snippets = JSON.parse(content);
        Object.entries(snippets).forEach(([key, value]) => {
          this.snippets.set(key, value as Snippet);
        });
      }
    }
  }

  async insertSnippet(editor: monaco.editor.ICodeEditor, snippetId: string) {
    const snippet = this.snippets.get(snippetId);
    if (!snippet) return;

    // Handle snippet variables and insertion
    const position = editor.getPosition();
    editor.executeEdits('snippet', [{
      range: new monaco.Range(
        position!.lineNumber,
        position!.column,
        position!.lineNumber,
        position!.column
      ),
      text: snippet.code
    }]);
  }
} 