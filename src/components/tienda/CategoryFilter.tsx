"use client";

import { cn } from "@/lib/utils";

type CategoryFilterProps = {
  categories: Array<{ id: string; name: string }>;
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
};

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "shrink-0 px-4 py-1.5 rounded-full text-sm font-body font-medium border transition-all duration-150",
          selected === null
            ? "bg-primary text-secondary border-primary"
            : "bg-secondary text-primary border-border hover:border-primary"
        )}
      >
        Todos
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            "shrink-0 px-4 py-1.5 rounded-full text-sm font-body font-medium border transition-all duration-150",
            selected === cat.id
              ? "bg-primary text-secondary border-primary"
              : "bg-secondary text-primary border-border hover:border-primary"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
