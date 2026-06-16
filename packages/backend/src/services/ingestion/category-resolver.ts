/**
 * PrismaCategoryResolver (CLAUDE.md §15.8 Phase 2) — implémentation backend de
 * {@link CategoryIdResolver} : slug de catégorie -> id, avec cache mémoire
 * chargé une seule fois (les catégories changent rarement). Slug absent -> null
 * (le service loggue + pose categoryId NULL, skip-not-crash).
 */
import type { PrismaClient } from '@prisma/client';
import type { CategorySlug } from '@kitchenxpert/common';

import type { CategoryIdResolver } from './catalog-ingestion.service';

export class PrismaCategoryResolver implements CategoryIdResolver {
  private cache: Map<string, string> | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  async idForSlug(slug: CategorySlug): Promise<string | null> {
    if (!this.cache) {
      const cats = await this.prisma.productCategory.findMany({ select: { slug: true, id: true } });
      this.cache = new Map(cats.map((c) => [c.slug, c.id]));
    }
    return this.cache.get(slug) ?? null;
  }
}
