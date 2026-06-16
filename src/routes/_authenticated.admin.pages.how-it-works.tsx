import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/cms/PageEditor";

export const Route = createFileRoute("/_authenticated/admin/pages/how-it-works")({
  component: () => (
    <PageEditor
      pageKey="how_it_works_page"
      title="How It Works page"
      itemKey="steps"
      itemLabel={(i, it) => `Step ${i + 1} — ${(it.title as string) || ""}`}
      makeEmpty={() => ({ title: "", body: "", image_path: null })}
      itemFields={[
        { key: "title", label: "Title", type: "text" },
        { key: "body", label: "Body", type: "textarea" },
        { key: "image_path", label: "Step image", type: "image", folder: "cms" },
      ]}
      extraBottomFields={[
        { key: "cta_label", label: "CTA label", type: "text" },
        { key: "cta_href", label: "CTA href", type: "text" },
      ]}
    />
  ),
});
