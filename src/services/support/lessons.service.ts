/**
 * LessonsService implementation
 * Handles lessons learned file management for F11
 */

import path from 'path';
import { getFileService } from '@/services/core/file.service';
import { getFoundryDir } from '@/lib/fs/paths';
import { generateId } from '@/lib/utils/id';

const LESSONS_FILE = 'lessons-learned.md';

/**
 * Lesson entry
 */
export interface Lesson {
  id: string;
  date: string;
  title: string;
  context: string;
  error: string;
  fix: string;
  rule: string;
  createdBy: 'user' | 'ai';
}

/**
 * LessonsService interface
 */
export interface ILessonsService {
  getLessons(projectPath: string): Promise<Lesson[]>;
  addLesson(
    projectPath: string,
    lesson: Omit<Lesson, 'id' | 'date'>
  ): Promise<void>;
  updateLesson(
    projectPath: string,
    lessonId: string,
    updates: Partial<Omit<Lesson, 'id' | 'date'>>
  ): Promise<void>;
  deleteLesson(projectPath: string, lessonId: string): Promise<void>;
  getLessonById(projectPath: string, lessonId: string): Promise<Lesson | null>;
}

/**
 * LessonsService implementation
 */
export class LessonsService implements ILessonsService {
  private fileService = getFileService();

  /**
   * Get lessons file path
   */
  private getLessonsPath(projectPath: string): string {
    return path.join(getFoundryDir(projectPath), LESSONS_FILE);
  }

  /**
   * Parse lessons from Markdown
   */
  private parseLessons(content: string): Lesson[] {
    const lessons: Lesson[] = [];

    // Split by separator lines
    const sections = content.split('\n---\n');

    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed || trimmed.startsWith('# Lessons Learned')) {
        continue;
      }

      // Extract metadata from heading (## 2025-01-15: API Error Format)
      const headingMatch = trimmed.match(/^## (\d{4}-\d{2}-\d{2}): (.+)$/m);
      if (!headingMatch || !headingMatch[1] || !headingMatch[2]) {
        continue;
      }

      const date = headingMatch[1];
      const title = headingMatch[2];

      // Extract fields
      const contextMatch = trimmed.match(/\*\*Context\*\*:\s*(.+?)(?=\n\*\*|$)/s);
      const errorMatch = trimmed.match(/\*\*Error\*\*:\s*(.+?)(?=\n\*\*|$)/s);
      const fixMatch = trimmed.match(/\*\*Fix\*\*:\s*(.+?)(?=\n\*\*|$)/s);
      const ruleMatch = trimmed.match(/\*\*Rule\*\*:\s*(.+?)(?=\n\*\*|$)/s);

      // Generate ID from date and title
      const id = `lesson_${date}_${title.replace(/\s+/g, '_').toLowerCase()}`;

      const lesson: Lesson = {
        id,
        date,
        title,
        context: contextMatch?.[1]?.trim() || '',
        error: errorMatch?.[1]?.trim() || '',
        fix: fixMatch?.[1]?.trim() || '',
        rule: ruleMatch?.[1]?.trim() || '',
        createdBy: 'user', // Default, will be overridden if specified
      };

      lessons.push(lesson);
    }

    return lessons;
  }

  /**
   * Format lessons as Markdown
   */
  private formatLessons(lessons: Lesson[]): string {
    let content = `# Lessons Learned

This file is maintained by AI and tracks corrected errors to prevent recurrence.

---
`;

    // Sort lessons by date (newest first)
    const sorted = [...lessons].sort((a, b) => b.date.localeCompare(a.date));

    for (const lesson of sorted) {
      content += `
## ${lesson.date}: ${lesson.title}

**Context**: ${lesson.context}
**Error**: ${lesson.error}
**Fix**: ${lesson.fix}
**Rule**: ${lesson.rule}

---
`;
    }

    return content;
  }

  /**
   * Get all lessons
   */
  async getLessons(projectPath: string): Promise<Lesson[]> {
    try {
      const lessonsPath = this.getLessonsPath(projectPath);

      // Check if file exists
      const exists = await this.fileService.exists(lessonsPath);
      if (!exists) {
        // Create empty lessons file
        await this.initializeLessons(projectPath);
        return [];
      }

      // Read file
      const content = await this.fileService.readText(lessonsPath);

      // Parse lessons
      return this.parseLessons(content);
    } catch (error) {
      throw new Error(`Failed to get lessons: ${(error as Error).message}`);
    }
  }

  /**
   * Get lesson by ID
   */
  async getLessonById(
    projectPath: string,
    lessonId: string
  ): Promise<Lesson | null> {
    const lessons = await this.getLessons(projectPath);
    return lessons.find((lesson) => lesson.id === lessonId) || null;
  }

  /**
   * Add a new lesson
   */
  async addLesson(
    projectPath: string,
    lesson: Omit<Lesson, 'id' | 'date'>
  ): Promise<void> {
    try {
      // Get existing lessons
      const lessons = await this.getLessons(projectPath);

      // Create new lesson with ID and date
      const date = new Date().toISOString().split('T')[0] || ''; // YYYY-MM-DD
      const id = generateId('lesson');

      const newLesson: Lesson = {
        id,
        date,
        title: lesson.title,
        context: lesson.context,
        error: lesson.error,
        fix: lesson.fix,
        rule: lesson.rule,
        createdBy: lesson.createdBy,
      };

      // Add to lessons
      lessons.push(newLesson);

      // Write back
      const content = this.formatLessons(lessons);
      const lessonsPath = this.getLessonsPath(projectPath);
      await this.fileService.writeText(lessonsPath, content);
    } catch (error) {
      throw new Error(`Failed to add lesson: ${(error as Error).message}`);
    }
  }

  /**
   * Update a lesson
   */
  async updateLesson(
    projectPath: string,
    lessonId: string,
    updates: Partial<Omit<Lesson, 'id' | 'date'>>
  ): Promise<void> {
    try {
      // Get existing lessons
      const lessons = await this.getLessons(projectPath);

      // Find lesson to update
      const index = lessons.findIndex((lesson) => lesson.id === lessonId);
      if (index === -1) {
        throw new Error(`Lesson not found: ${lessonId}`);
      }

      // Update lesson - preserve id and date
      const existing = lessons[index];
      if (!existing) {
        throw new Error(`Lesson not found at index: ${index}`);
      }

      const updated: Lesson = {
        id: existing.id,
        date: existing.date,
        title: updates.title ?? existing.title,
        context: updates.context ?? existing.context,
        error: updates.error ?? existing.error,
        fix: updates.fix ?? existing.fix,
        rule: updates.rule ?? existing.rule,
        createdBy: updates.createdBy ?? existing.createdBy,
      };

      lessons[index] = updated;

      // Write back
      const content = this.formatLessons(lessons);
      const lessonsPath = this.getLessonsPath(projectPath);
      await this.fileService.writeText(lessonsPath, content);
    } catch (error) {
      throw new Error(`Failed to update lesson: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a lesson
   */
  async deleteLesson(projectPath: string, lessonId: string): Promise<void> {
    try {
      // Get existing lessons
      const lessons = await this.getLessons(projectPath);

      // Filter out the lesson
      const filtered = lessons.filter((lesson) => lesson.id !== lessonId);

      if (filtered.length === lessons.length) {
        throw new Error(`Lesson not found: ${lessonId}`);
      }

      // Write back
      const content = this.formatLessons(filtered);
      const lessonsPath = this.getLessonsPath(projectPath);
      await this.fileService.writeText(lessonsPath, content);
    } catch (error) {
      throw new Error(`Failed to delete lesson: ${(error as Error).message}`);
    }
  }

  /**
   * Initialize lessons file
   */
  private async initializeLessons(projectPath: string): Promise<void> {
    const content = `# Lessons Learned

This file is maintained by AI and tracks corrected errors to prevent recurrence.

---
`;

    const lessonsPath = this.getLessonsPath(projectPath);
    const foundryDir = getFoundryDir(projectPath);
    await this.fileService.ensureDir(foundryDir);
    await this.fileService.writeText(lessonsPath, content);
  }

  /**
   * Search lessons by keyword
   */
  async searchLessons(projectPath: string, keyword: string): Promise<Lesson[]> {
    const lessons = await this.getLessons(projectPath);
    const lowerKeyword = keyword.toLowerCase();

    return lessons.filter(
      (lesson) =>
        lesson.title.toLowerCase().includes(lowerKeyword) ||
        lesson.context.toLowerCase().includes(lowerKeyword) ||
        lesson.error.toLowerCase().includes(lowerKeyword) ||
        lesson.rule.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Export lessons as JSON
   */
  async exportLessons(projectPath: string): Promise<string> {
    const lessons = await this.getLessons(projectPath);
    return JSON.stringify(lessons, null, 2);
  }
}

/**
 * Create singleton instance
 */
let lessonsServiceInstance: LessonsService | null = null;

export function getLessonsService(): LessonsService {
  if (!lessonsServiceInstance) {
    lessonsServiceInstance = new LessonsService();
  }
  return lessonsServiceInstance;
}

/**
 * Reset singleton instance
 */
export function resetLessonsService(): void {
  lessonsServiceInstance = null;
}
