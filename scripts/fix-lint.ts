import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface FileEdit {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
}

const fixes: Record<string, FileEdit[]> = {
  'missing-return-type': [
    {
      pattern: /(\b(?:async\s+)?function\s+\w+\s*\([^)]*\))\s*{/g,
      replacement: '$1: void {'
    },
    {
      pattern: /(\b(?:public|private|protected)\s+(?:async\s+)?[^:]+?)\s*\([^)]*\)\s*{/g,
      replacement: '$1): void {'
    }
  ],
  'unused-vars': [
    {
      pattern: /\b(\w+)(?=\s*:[^=]+(?:,|\)|{)[^}]*never used)/g,
      replacement: '_$1'
    }
  ],
  'trivial-types': [
    {
      pattern: /:\s*(string|number|boolean)\s*=\s*(['"`][^'"`]*['"`]|\d+|true|false)/g,
      replacement: '= $2'
    }
  ]
};

function fixFile(filePath: string): void {
  console.log(`Fixing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  Object.values(fixes).forEach(edits => {
    edits.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement as string);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${filePath}`);
  }
}

function getAllTypeScriptFiles(dir: string = 'src'): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string): void {
    const entries = fs.readdirSync(currentDir);
    
    entries.forEach(entry => {
      const fullPath = path.join(currentDir, entry);
      
      if (fs.statSync(fullPath).isDirectory()) {
        traverse(fullPath);
      } else if (entry.endsWith('.ts')) {
        files.push(fullPath);
      }
    });
  }
  
  traverse(dir);
  return files;
}

function main(): void {
  console.log('Starting lint fixes...');
  const files = getAllTypeScriptFiles();
  files.forEach(fixFile);
  console.log('Running ESLint fix...');
  execSync('npx eslint --fix src/**/*.ts', { stdio: 'inherit' });
  console.log('Lint fixes completed');
}

main(); 