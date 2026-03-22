"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CategoryFilter } from "./CategoryFilter";

type CatalogoFiltersProps = {
  categories: Array<{ id: string; name: string }>;
  currentSearch: string;
  currentCategory: string;
  currentSort: string;
};

export function CatalogoFilters({
  categories,
  currentSearch,
  currentCategory,
  currentSort,
}: CatalogoFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(currentSearch);
  const [isPending, startTransition] = useTransition();

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams();
    const merged = {
      busqueda: search,
      categoria: currentCategory,
      orden: currentSort,
      ...updates,
    };
    Object.entries(merged).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    // Reset to page 1 on filter change
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ busqueda: search });
  };

  return (
    <div className="space-y-4">
      {/* Search + Sort row */}
      <div className="flex gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="flex-1"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-primary text-secondary rounded hover:bg-accent transition-colors"
            aria-label="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
        <Select
          value={currentSort}
          onChange={(e) => updateParams({ orden: e.target.value })}
          className="w-40 shrink-0"
        >
          <option value="">Relevancia</option>
          <option value="precio_asc">Precio ↑</option>
          <option value="precio_desc">Precio ↓</option>
          <option value="nombre">Nombre A-Z</option>
        </Select>
      </div>

      {/* Category chips */}
      <CategoryFilter
        categories={categories}
        selected={currentCategory || null}
        onSelect={(id) => updateParams({ categoria: id ?? "" })}
      />

      {isPending && (
        <div className="h-0.5 w-full bg-gray-light overflow-hidden rounded">
          <div className="h-full bg-primary animate-pulse w-1/2" />
        </div>
      )}
    </div>
  );
}
