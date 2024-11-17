interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  template: string;
  variables: TemplateVariable[];
}

interface GeneratedCode {
  content: string;
  language: string;
  imports: string[];
  dependencies: string[];
}

export class CodeGeneratorService {
  private templates: Map<string, CodeTemplate> = new Map();
  private generators: Map<string, CodeGenerator> = new Map();

  async generateCode(
    templateId: string,
    variables: Record<string, any>
  ): Promise<GeneratedCode> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');

    const generator = this.generators.get(template.language);
    if (!generator) throw new Error(`No generator for ${template.language}`);

    const processedTemplate = await this.processTemplate(template, variables);
    const generatedCode = await generator.generate(processedTemplate);

    await this.validateGeneratedCode(generatedCode);
    return generatedCode;
  }

  async generateFromSchema(schema: any, language: string): Promise<GeneratedCode> {
    const generator = this.generators.get(language);
    if (!generator) throw new Error(`No generator for ${language}`);

    const code = await generator.generateFromSchema(schema);
    await this.validateGeneratedCode(code);
    
    return code;
  }

  private async processTemplate(
    template: CodeTemplate,
    variables: Record<string, any>
  ): Promise<string> {
    let processed = template.template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processed = processed.replace(regex, value);
    }
    
    return processed;
  }
} 