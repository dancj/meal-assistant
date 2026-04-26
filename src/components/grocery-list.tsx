import type { GroceryItem, Store } from "@/lib/plan/types";
import { STORES } from "@/lib/plan/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STORE_LABELS: Record<Store, string> = {
  aldi: "Aldi",
  safeway: "Safeway",
  costco: "Costco",
  wegmans: "Wegmans",
};

export interface GroceryListProps {
  items: GroceryItem[];
}

function groupByStore(items: GroceryItem[]): Map<Store, GroceryItem[]> {
  const groups = new Map<Store, GroceryItem[]>();
  for (const store of STORES) groups.set(store, []);
  for (const item of items) {
    groups.get(item.store)?.push(item);
  }
  return groups;
}

function StoreSection({
  store,
  items,
}: {
  store: Store;
  items: GroceryItem[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="mb-2 text-sm font-semibold text-foreground/80">
        {STORE_LABELS[store]}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li
            key={`${item.item}-${i}`}
            className="flex items-baseline justify-between gap-2 text-sm"
          >
            <span>
              {item.quantity !== "" && (
                <span className="text-muted-foreground">{item.quantity} · </span>
              )}
              <span>{item.item}</span>
            </span>
            {item.dealMatch !== null && (
              <Badge variant="secondary" className="shrink-0">
                <span aria-hidden="true">🏷 </span>
                {item.dealMatch.salePrice}
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GroceryList({ items }: GroceryListProps) {
  const groups = groupByStore(items);

  return (
    <Card aria-label="Grocery list">
      <CardHeader>
        <CardTitle>Grocery list</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No grocery items.</p>
        ) : (
          STORES.map((store) => (
            <StoreSection
              key={store}
              store={store}
              items={groups.get(store) ?? []}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
