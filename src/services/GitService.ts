import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';

export class GitService {
  private git: SimpleGit;

  constructor(workingDirectory: string) {
    const options: SimpleGitOptions = {
      baseDir: workingDirectory,
      binary: 'git',
      maxConcurrentProcesses: 6,
    };
    this.git = simpleGit(options);
  }

  async status() {
    return await this.git.status();
  }

  async commit(message: string) {
    return await this.git.commit(message);
  }

  async checkout(branch: string) {
    return await this.git.checkout(branch);
  }

  async getCurrentBranch() {
    const result = await this.git.branch();
    return result.current;
  }

  async getDiff() {
    return await this.git.diff();
  }
} 