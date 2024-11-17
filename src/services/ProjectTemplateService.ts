interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  files: TemplateFile[];
  variables: TemplateVariable[];
  hooks: TemplateHooks;
  dependencies: Record<string, string>;
}

interface TemplateHooks {
  beforeCreate?: () => Promise<void>;
  afterCreate?: () => Promise<void>;
  beforeInstall?: () => Promise<void>;
  afterInstall?: () => Promise<void>;
}

export class ProjectTemplateService {
  private templates: Map<string, ProjectTemplate> = new Map();
  private processor: TemplateProcessor;
  private validator: TemplateValidator;

  async createProject(templateId: string, options: ProjectOptions): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    // Validate options
    await this.validator.validateOptions(template, options);

    try {
      // Execute pre-creation hooks
      await template.hooks.beforeCreate?.();

      // Process variables
      const variables = await this.processVariables(template.variables, options);

      // Create project structure
      await this.createProjectStructure(template, variables);

      // Process template files
      await this.processTemplateFiles(template, variables);

      // Install dependencies
      if (template.dependencies) {
        await this.installDependencies(template.dependencies);
      }

      // Execute post-creation hooks
      await template.hooks.afterCreate?.();
    } catch (error) {
      await this.handleTemplateError(template, error);
      throw error;
    }
  }

  private async processTemplateFiles(
    template: ProjectTemplate,
    variables: Record<string, string>
  ): Promise<void> {
    for (const file of template.files) {
      const processedContent = await this.processor.processTemplate(
        file.content,
        variables
      );
      
      const targetPath = this.processor.processPath(file.path, variables);
      await fs.writeFile(targetPath, processedContent);
    }
  }
} 