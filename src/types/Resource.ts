export interface Resource {
  cleanup(): Promise<void>;
} 