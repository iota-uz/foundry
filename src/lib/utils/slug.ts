/**
 * Slug generation and validation utilities
 */

/**
 * Generate a slug from a name
 * Converts to lowercase, replaces spaces with hyphens, removes special chars
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Validate a slug format
 * Must be lowercase, alphanumeric with hyphens, no spaces
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Make a slug unique by appending a number if it already exists
 */
export function makeUniqueSlug(
  slug: string,
  existingSlugs: string[]
): string {
  if (!existingSlugs.includes(slug)) {
    return slug;
  }

  let counter = 1;
  let uniqueSlug = `${slug}-${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Extract slug from file path
 * /path/to/file.yaml -> file
 */
export function extractSlugFromPath(filePath: string): string {
  const fileName = filePath.split('/').pop() ?? '';
  return fileName.replace(/\.(yaml|yml|md)$/, '');
}

/**
 * Validate slug uniqueness within a scope
 */
export function validateSlugUniqueness(
  slug: string,
  existingSlugs: string[],
  scope: string
): { valid: boolean; error?: string } {
  if (!isValidSlug(slug)) {
    return {
      valid: false,
      error: 'Invalid slug format. Must be lowercase, alphanumeric with hyphens.',
    };
  }

  if (existingSlugs.includes(slug)) {
    return {
      valid: false,
      error: `Slug "${slug}" already exists in ${scope}. Please choose a unique name.`,
    };
  }

  return { valid: true };
}
