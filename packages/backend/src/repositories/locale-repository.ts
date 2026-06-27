import { type PrismaClient, type Locale, type Translation } from '@prisma/client';

/**
 * Locale Repository
 * Handles all i18n locale and translation database operations using Prisma ORM.
 */

export interface LocaleWithTranslations extends Locale {
  translations?: Translation[];
  _count?: { translations: number };
}

export interface CreateLocaleDto {
  code: string;
  name: string;
  nativeName: string;
  isDefault?: boolean;
}

export interface CreateTranslationDto {
  localeId: string;
  namespace: string;
  key: string;
  value: string;
}

export interface TranslationFilters {
  localeId?: string;
  namespace?: string;
  search?: string;
}

export class LocaleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ==================== LOCALES ====================

  async findLocaleById(id: string): Promise<LocaleWithTranslations | null> {
    return this.prisma.locale.findUnique({
      where: { id },
      include: { _count: { select: { translations: true } } },
    });
  }

  async findLocaleByCode(code: string): Promise<Locale | null> {
    return this.prisma.locale.findUnique({ where: { code } });
  }

  async findAllLocales(isActive?: boolean): Promise<Locale[]> {
    return this.prisma.locale.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      include: { _count: { select: { translations: true } } },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async getDefaultLocale(): Promise<Locale | null> {
    return this.prisma.locale.findFirst({ where: { isDefault: true } });
  }

  async createLocale(data: CreateLocaleDto): Promise<Locale> {
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.locale.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.locale.create({
        data: {
          code: data.code.toLowerCase(),
          name: data.name,
          nativeName: data.nativeName,
          isDefault: data.isDefault || false,
        },
      });
    });
  }

  async updateLocale(
    id: string,
    data: Partial<CreateLocaleDto> & { isActive?: boolean }
  ): Promise<Locale> {
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.locale.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.locale.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.nativeName && { nativeName: data.nativeName }),
          ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });
    });
  }

  async deleteLocale(id: string): Promise<Locale> {
    const locale = await this.findLocaleById(id);
    if (locale?.isDefault) {
      throw new Error('Cannot delete default locale');
    }
    return this.prisma.locale.delete({ where: { id } });
  }

  async setDefaultLocale(id: string): Promise<Locale> {
    return this.prisma.$transaction(async (tx) => {
      await tx.locale.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      return tx.locale.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }

  // ==================== TRANSLATIONS ====================

  async findTranslation(
    localeId: string,
    namespace: string,
    key: string
  ): Promise<Translation | null> {
    return this.prisma.translation.findUnique({
      where: { localeId_namespace_key: { localeId, namespace, key } },
    });
  }

  async findTranslations(filters: TranslationFilters = {}): Promise<Translation[]> {
    return this.prisma.translation.findMany({
      where: {
        ...(filters.localeId && { localeId: filters.localeId }),
        ...(filters.namespace && { namespace: filters.namespace }),
        ...(filters.search && {
          OR: [
            { key: { contains: filters.search, mode: 'insensitive' } },
            { value: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { locale: true },
      orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
    });
  }

  async getNamespaceTranslations(
    localeCode: string,
    namespace: string
  ): Promise<Record<string, string>> {
    const locale = await this.findLocaleByCode(localeCode);
    if (!locale) {
      return {};
    }

    const translations = await this.prisma.translation.findMany({
      where: { localeId: locale.id, namespace },
    });

    const result: Record<string, string> = {};
    translations.forEach((t) => {
      result[t.key] = t.value;
    });
    return result;
  }

  async getAllTranslationsForLocale(
    localeCode: string
  ): Promise<Record<string, Record<string, string>>> {
    const locale = await this.findLocaleByCode(localeCode);
    if (!locale) {
      return {};
    }

    const translations = await this.prisma.translation.findMany({
      where: { localeId: locale.id },
    });

    const result: Record<string, Record<string, string>> = {};
    translations.forEach((t) => {
      if (!result[t.namespace]) {
        result[t.namespace] = {};
      }
      result[t.namespace]![t.key] = t.value;
    });
    return result;
  }

  async createTranslation(data: CreateTranslationDto): Promise<Translation> {
    return this.prisma.translation.create({ data });
  }

  async upsertTranslation(data: CreateTranslationDto): Promise<Translation> {
    return this.prisma.translation.upsert({
      where: {
        localeId_namespace_key: {
          localeId: data.localeId,
          namespace: data.namespace,
          key: data.key,
        },
      },
      create: data,
      update: { value: data.value },
    });
  }

  async createManyTranslations(translations: CreateTranslationDto[]): Promise<{ count: number }> {
    return this.prisma.translation.createMany({
      data: translations,
      skipDuplicates: true,
    });
  }

  async updateTranslation(id: string, value: string): Promise<Translation> {
    return this.prisma.translation.update({
      where: { id },
      data: { value },
    });
  }

  async deleteTranslation(id: string): Promise<Translation> {
    return this.prisma.translation.delete({ where: { id } });
  }

  async deleteNamespaceTranslations(
    localeId: string,
    namespace: string
  ): Promise<{ count: number }> {
    return this.prisma.translation.deleteMany({
      where: { localeId, namespace },
    });
  }

  async getNamespaces(): Promise<string[]> {
    const namespaces = await this.prisma.translation.findMany({
      select: { namespace: true },
      distinct: ['namespace'],
      orderBy: { namespace: 'asc' },
    });
    return namespaces.map((n) => n.namespace);
  }

  async countTranslations(localeId?: string): Promise<number> {
    return this.prisma.translation.count({
      where: localeId ? { localeId } : undefined,
    });
  }

  async getMissingTranslations(
    sourceLocaleId: string,
    targetLocaleId: string
  ): Promise<{ namespace: string; key: string }[]> {
    const sourceTranslations = await this.prisma.translation.findMany({
      where: { localeId: sourceLocaleId },
      select: { namespace: true, key: true },
    });

    const targetTranslations = await this.prisma.translation.findMany({
      where: { localeId: targetLocaleId },
      select: { namespace: true, key: true },
    });

    const targetSet = new Set(targetTranslations.map((t) => `${t.namespace}:${t.key}`));
    return sourceTranslations.filter((t) => !targetSet.has(`${t.namespace}:${t.key}`));
  }

  async importTranslations(
    localeCode: string,
    data: Record<string, Record<string, string>>
  ): Promise<{ count: number }> {
    const locale = await this.findLocaleByCode(localeCode);
    if (!locale) {
      throw new Error('Locale not found');
    }

    const translations: CreateTranslationDto[] = [];
    for (const [namespace, keys] of Object.entries(data)) {
      for (const [key, value] of Object.entries(keys)) {
        translations.push({ localeId: locale.id, namespace, key, value });
      }
    }

    // Batch upsert using $transaction to avoid N+1 queries
    const result = await this.prisma.$transaction(
      translations.map((t) =>
        this.prisma.translation.upsert({
          where: {
            localeId_namespace_key: {
              localeId: t.localeId,
              namespace: t.namespace,
              key: t.key,
            },
          },
          update: { value: t.value },
          create: t,
        })
      )
    );
    return { count: result.length };
  }
}

export default LocaleRepository;
