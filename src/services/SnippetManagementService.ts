interface CodeSnippet {
  id: string;
  name: string;
  description: string;
  code: string;
  language: string;
  tags: string[];
  variables: SnippetVariable[];
}

interface SnippetVariable {
  name: string;
  defaultValue: string;
  description?: string;
}

export class SnippetManagementService {
  private snippets: Map<string, CodeSnippet> = new Map();
  private storage: StorageService;

  async createSnippet(snippet: Omit<CodeSnippet, 'id'>): Promise<CodeSnippet> {
    const id = crypto.randomUUID();
    const newSnippet: CodeSnippet = {
      id,
      ...snippet
    };

    await this.validateSnippet(newSnippet);
    await this.storage.saveSnippet(newSnippet);
    this.snippets.set(id, newSnippet);

    return newSnippet;
  }

  async insertSnippet(snippetId: string, editor: monaco.editor.ICodeEditor) {
    const snippet = this.snippets.get(snippetId);
    if (!snippet) throw new Error('Snippet not found');

    const variables = await this.promptForVariables(snippet.variables);
    const processedCode = this.processSnippetVariables(snippet.code, variables);
    
    const position = editor.getPosition();
    editor.executeEdits('snippet-insert', [{
      range: new monaco.Range(
        position!.lineNumber,
        position!.column,
        position!.lineNumber,
        position!.column
      ),
      text: processedCode
    }]);
  }
} 