import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/cms/PageEditor";

export const Route = createFileRoute("/_authenticated/admin/pages/pricing")({
  component: () => (
    <PageEditor
      pageKey="pricing_page"
      title="Pricing page"
      itemKey="tiers"
      itemLabel={(i, it) => `Tier ${i + 1} — ${(it.name as string) || ""}`}
      makeEmpty={() => ({ name: "", price: "", period: "per event", features: [], cta_label: "Choose", highlighted: false })}
      itemFields={[
        { key: "name", label: "Name", type: "text" },
        { key: "price", label: "Price", type: "text" },
        { key: "period", label: "Period", type: "text" },
        { key: "features", label: "Features", type: "list" },
        { key: "cta_label", label: "CTA label", type: "text" },
        { key: "highlighted", label: "Highlight this tier", type: "boolean" },
      ]}
      extraBottomFields={[{ key: "footer_note", label: "Footer note", type: "text" }]}
    />
  ),
});
