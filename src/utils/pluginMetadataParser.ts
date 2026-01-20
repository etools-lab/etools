/**
 * etools Plugin Metadata Parser
 * ETP (etools Plugin Metadata Protocol) 解析器
 *
 * 严格验证插件元数据，不做向后兼容
 */

import type { EtoolsMetadata, PluginCategory, PluginSetting } from '@/types/plugin';
import { EtoolsMetadataError } from '@/types/plugin';

/**
 * 统一的插件元数据解析器
 */
export class PluginMetadataParser {
  /**
   * 从 package.json 解析插件元数据（严格模式，不做向后兼容）
   */
  static fromPackageJson(packageJson: any): EtoolsMetadata {
    // 1. 检查必须有 etools 字段
    if (!packageJson.etools) {
      throw new EtoolsMetadataError(
        'MISSING_ETOOLS_FIELD',
        "Missing required 'etools' field in package.json"
      );
    }

    const etools = packageJson.etools;

    // 2. 验证包名必须以 @etools-plugin/ 开头
    const packageName = packageJson.name;
    if (!packageName || !packageName.startsWith('@etools-plugin/')) {
      throw new EtoolsMetadataError(
        'INVALID_PACKAGE_NAME',
        `Invalid package name '${packageName}', must start with @etools-plugin/`
      );
    }

    // 3. 解析 id（必填）
    if (!etools.id) {
      throw new EtoolsMetadataError(
        'MISSING_REQUIRED_FIELD',
        "Missing required field: etools.id",
        'id'
      );
    }

    // 4. 解析 displayName（必填）
    if (!etools.displayName) {
      throw new EtoolsMetadataError(
        'MISSING_REQUIRED_FIELD',
        "Missing required field: etools.displayName",
        'displayName'
      );
    }

    // 5. 解析 category（必填）
    if (!etools.category) {
      throw new EtoolsMetadataError(
        'MISSING_REQUIRED_FIELD',
        "Missing required field: etools.category",
        'category'
      );
    }

    const category = this.parseCategory(etools.category);
    if (!category) {
      throw new EtoolsMetadataError(
        'INVALID_CATEGORY',
        `Invalid category '${etools.category}', must be one of: productivity, developer, utilities, search, media, integration`
      );
    }

    // 6. 解析 permissions（必填）
    if (!Array.isArray(etools.permissions)) {
      throw new EtoolsMetadataError(
        'MISSING_REQUIRED_FIELD',
        "Missing required field: etools.permissions",
        'permissions'
      );
    }

    // 7. 解析 triggers（必填）
    if (!Array.isArray(etools.triggers)) {
      throw new EtoolsMetadataError(
        'MISSING_REQUIRED_FIELD',
        "Missing required field: etools.triggers",
        'triggers'
      );
    }

    // 8. 解析 description（可选，优先使用 etools.description）
    const description = etools.description || packageJson.description;

    // 构造 EtoolsMetadata
    const metadata: EtoolsMetadata = {
      id: etools.id,
      displayName: etools.displayName,
      description,
      category,
      icon: etools.icon,
      homepage: etools.homepage,
      screenshots: etools.screenshots,
      permissions: etools.permissions,
      triggers: etools.triggers,
      settings: etools.settings,
    };

    // 9. 验证元数据完整性
    this.validate(metadata);

    return metadata;
  }

  /**
   * 从 JSON 字符串解析插件元数据
   */
  static fromPackageJsonString(jsonString: string): EtoolsMetadata {
    try {
      const packageJson = JSON.parse(jsonString);
      return this.fromPackageJson(packageJson);
    } catch (error) {
      if (error instanceof EtoolsMetadataError) {
        throw error;
      }
      throw new EtoolsMetadataError(
        'MISSING_ETOOLS_FIELD',
        `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 解析分类字符串
   */
  private static parseCategory(category: string): PluginCategory | null {
    const validCategories: PluginCategory[] = [
      'productivity',
      'developer',
      'utilities',
      'search',
      'media',
      'integration',
    ];

    const normalized = category.toLowerCase();
    if (validCategories.includes(normalized as PluginCategory)) {
      return normalized as PluginCategory;
    }

    return null;
  }

  /**
   * 验证元数据完整性
   */
  private static validate(metadata: EtoolsMetadata): void {
    if (!metadata.id || metadata.id.trim().length === 0) {
      throw new EtoolsMetadataError(
        'MISSING_REQUIRED_FIELD',
        'Plugin id cannot be empty',
        'id'
      );
    }

    if (!metadata.displayName || metadata.displayName.trim().length === 0) {
      throw new EtoolsMetadataError(
        'MISSING_REQUIRED_FIELD',
        'Plugin displayName cannot be empty',
        'displayName'
      );
    }

    if (!metadata.triggers || metadata.triggers.length === 0) {
      throw new EtoolsMetadataError(
        'MISSING_REQUIRED_FIELD',
        'Plugin must have at least one trigger',
        'triggers'
      );
    }
  }

  /**
   * 从 npm 包名提取插件 ID（辅助方法）
   */
  static extractIdFromPackageName(packageName: string): string {
    return packageName.replace(/^@etools-plugin\//, '');
  }

  /**
   * 从插件 ID 生成 npm 包名（辅助方法）
   */
  static getPackageName(id: string): string {
    return `@etools-plugin/${id}`;
  }
}

/**
 * 便捷的导出函数
 */
export function parsePluginMetadata(packageJson: any): EtoolsMetadata {
  return PluginMetadataParser.fromPackageJson(packageJson);
}

export function parsePluginMetadataString(jsonString: string): EtoolsMetadata {
  return PluginMetadataParser.fromPackageJsonString(jsonString);
}
