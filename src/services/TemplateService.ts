interface Template {
  id: string;
  name: string;
  description: string;
  files: TemplateFile[];
  variables: Record<string, string>;
  dependencies?: Record<string, string>;
}

interface TemplateFile {
  path: string;
  content: string;
}

export class TemplateService {
  private templates: Map<string, Template> = new Map();

  async loadTemplates() {
    const templatesPath = path.join(__dirname, '../templates');
    const entries = await fs.readdir(templatesPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const template = await this.loadTemplate(path.join(templatesPath, entry.name));
        this.templates.set(template.id, template);
      }
    }
  }

  async createFromTemplate(templateId: string, targetPath: string, variables: Record<string, string>) {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    for (const file of template.files) {
      const processedContent = this.processTemplateVariables(file.content, variables);
      const targetFilePath = path.join(targetPath, file.path);
      
      await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
      await fs.writeFile(targetFilePath, processedContent);
    }

    if (template.dependencies) {
      await this.installDependencies(targetPath, template.dependencies);
    }
  }
} 