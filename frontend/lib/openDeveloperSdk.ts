/**
 * Open-Source Developer SDK & Practice Plugin Interface (Week 51)
 *
 * Public SDK for third-party clinical practice developers to build and register custom tools.
 */

export interface DeveloperPracticePlugin {
  pluginId: string;
  author: string;
  title: string;
  executePractice: () => string;
}

export function registerDeveloperPlugin(plugin: DeveloperPracticePlugin): boolean {
  return Boolean(plugin.pluginId && plugin.title);
}
