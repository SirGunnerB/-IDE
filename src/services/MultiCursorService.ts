interface Cursor {
  id: string;
  line: number;
  column: number;
  selection?: Selection;
}

interface Selection {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export class MultiCursorService {
  private cursors: Cursor[] = [];
  private editor: monaco.editor.ICodeEditor;

  constructor(editor: monaco.editor.ICodeEditor) {
    this.editor = editor;
    this.setupListeners();
  }

  addCursor(line: number, column: number) {
    const cursor: Cursor = {
      id: crypto.randomUUID(),
      line,
      column
    };
    
    this.cursors.push(cursor);
    this.updateEditorCursors();
  }

  addCursorForNextMatch() {
    const selection = this.editor.getSelection();
    if (!selection) return;

    const text = this.editor.getModel()?.getValueInRange(selection);
    if (!text) return;

    const nextMatch = this.findNextMatch(text, selection);
    if (nextMatch) {
      this.addCursor(nextMatch.line, nextMatch.column);
    }
  }

  private setupListeners() {
    this.editor.onDidChangeCursorPosition((e) => {
      this.updateCursorPositions(e);
    });
  }
} 