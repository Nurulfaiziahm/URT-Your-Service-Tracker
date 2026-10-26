import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Template Renderer Service
 * Renders Handlebars email templates
 */
class RendererService {
  private baseLayout: HandlebarsTemplateDelegate | null = null;
  private templateCache = new Map<string, HandlebarsTemplateDelegate>();

  constructor() {
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Format Rupiah helper
    Handlebars.registerHelper('formatRupiah', (value: number | string) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
    });

    // Format date helper (en-US fallback)
    Handlebars.registerHelper('formatDate', (date: string | Date) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Format Indonesian date helper with timezone support
    Handlebars.registerHelper('formatDateID', (date: string | Date, timezone?: string) => {
      if (!date) return '-';
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('id-ID', {
        timeZone: typeof timezone === 'string' ? timezone : 'Asia/Jakarta',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    // Current year helper
    Handlebars.registerHelper('year', () => new Date().getFullYear());
  }

  /**
   * Load and compile base layout template
   */
  private getBaseLayout(): HandlebarsTemplateDelegate {
    if (!this.baseLayout) {
      const templatePath = join(__dirname, 'templates', 'base.hbs');
      const source = readFileSync(templatePath, 'utf-8');
      this.baseLayout = Handlebars.compile(source);
    }
    return this.baseLayout;
  }

  /**
   * Load and compile a template
   */
  private getTemplate(name: string): HandlebarsTemplateDelegate {
    if (!this.templateCache.has(name)) {
      const templatePath = join(__dirname, 'templates', `${name}.hbs`);
      const source = readFileSync(templatePath, 'utf-8');
      this.templateCache.set(name, Handlebars.compile(source));
    }
    return this.templateCache.get(name)!;
  }

  /**
   * Render a template with data
   */
  render(templateName: string, data: Record<string, any>): string {
    const template = this.getTemplate(templateName);
    const content = template(data);

    // Wrap content in base layout
    const baseLayout = this.getBaseLayout();
    return baseLayout({
      title: data.title || 'URT - Your Service Tracker',
      preheader: data.preheader || '',
      year: new Date().getFullYear(),
      content,
    });
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.templateCache.clear();
    this.baseLayout = null;
  }
}

export const renderer = new RendererService();
