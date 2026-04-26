import type { Deal, Store as DealStore } from "@/lib/deals/types";
import { MERCHANTS, STORES as DEAL_STORES } from "@/lib/deals/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DealsSidebarProps {
  deals: Deal[];
}

function groupByStore(deals: Deal[]): Map<DealStore, Deal[]> {
  const groups = new Map<DealStore, Deal[]>();
  for (const store of DEAL_STORES) groups.set(store, []);
  for (const deal of deals) {
    groups.get(deal.store)?.push(deal);
  }
  return groups;
}

function promoLabel(deal: Deal): string | null {
  switch (deal.promoType) {
    case "bogo":
      return "BOGO";
    case "multi_buy":
      return "Multi-buy";
    case "amount_off":
      return "$ off";
    case "percent_off":
      return "% off";
    case "sale":
      return null;
  }
}

function StoreSection({ store, deals }: { store: DealStore; deals: Deal[] }) {
  if (deals.length === 0) return null;
  return (
    <section className="mb-4 last:mb-0">
      <h2 className="mb-2 text-sm font-semibold text-foreground/80">
        {MERCHANTS[store].displayName}
      </h2>
      <ul className="flex flex-col gap-2">
        {deals.map((deal, i) => {
          const promo = promoLabel(deal);
          return (
            <li
              key={`${deal.productName}-${i}`}
              className="flex flex-col gap-0.5 rounded-md bg-card/60 p-2 text-xs ring-1 ring-foreground/5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium leading-tight">
                  {deal.productName}
                </span>
                <span className="font-semibold text-success">
                  {deal.salePrice}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="truncate">{deal.brand}</span>
                {promo !== null && (
                  <Badge variant="secondary" className="shrink-0">
                    {promo}
                  </Badge>
                )}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                Through {deal.validTo}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DealsSidebar({ deals }: DealsSidebarProps) {
  const groups = groupByStore(deals);
  const total = deals.length;

  if (total === 0) {
    return (
      <Card size="sm" aria-label="This week's deals">
        <CardHeader>
          <CardTitle>This week&apos;s deals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No deals available right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm" aria-label="This week's deals">
      <CardHeader>
        <CardTitle>This week&apos;s deals</CardTitle>
      </CardHeader>
      <CardContent>
        {DEAL_STORES.map((store) => (
          <StoreSection
            key={store}
            store={store}
            deals={groups.get(store) ?? []}
          />
        ))}
      </CardContent>
    </Card>
  );
}
