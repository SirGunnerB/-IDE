import * as ts from 'typescript';
import { Logger } from '../utils/Logger';

export class Parser {
  private readonly logger = new Logger('DocParser');

  parse(content: string, filePath: string): Documentation {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const documentation: Documentation = {
      modules: [],
      classes: [],
      interfaces: [],
      functions: []
    };

    this.visit(sourceFile, documentation);
    return documentation;
  }

  private visit(node: ts.Node, documentation: Documentation): void {
    if (ts.isClassDeclaration(node)) {
      documentation.classes.push(this.parseClass(node));
    } else if (ts.isInterfaceDeclaration(node)) {
      documentation.interfaces.push(this.parseInterface(node));
    } else if (ts.isFunctionDeclaration(node)) {
      documentation.functions.push(this.parseFunction(node));
    } else if (ts.isModuleDeclaration(node)) {
      documentation.modules.push(this.parseModule(node));
    }

    ts.forEachChild(node, child => this.visit(child, documentation));
  }

  private parseClass(node: ts.ClassDeclaration): ClassDoc {
    return {
      name: node.name?.text ?? 'Anonymous',
      description: this.getJsDoc(node),
      methods: this.parseMethods(node),
      properties: this.parseProperties(node),
      decorators: this.parseDecorators(node)
    };
  }

  private parseInterface(node: ts.InterfaceDeclaration): InterfaceDoc {
    return {
      name: node.name.text,
      description: this.getJsDoc(node),
      properties: this.parseProperties(node),
      methods: this.parseMethods(node)
    };
  }

  private parseFunction(node: ts.FunctionDeclaration): FunctionDoc {
    return {
      name: node.name?.text ?? 'Anonymous',
      description: this.getJsDoc(node),
      parameters: this.parseParameters(node),
      returnType: this.parseReturnType(node)
    };
  }

  private parseModule(node: ts.ModuleDeclaration): ModuleDoc {
    return {
      name: node.name.text,
      description: this.getJsDoc(node)
    };
  }

  // Helper methods...
  private getJsDoc(node: ts.Node): string {
    const jsDoc = ts.getJSDocTags(node);
    return jsDoc.map(doc => doc.getText()).join('\n');
  }

  // Additional parsing methods...
} 