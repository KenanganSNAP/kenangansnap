import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/cms/PageEditor";

export const Route = createFileRoute("/_authenticated/admin/pages/about")({
  component: () => (
    <PageEditor
      pageKey="about_page"
      title="About page"
      itemKey="team"
      itemLabel={(i, it) => `Member ${i + 1} — ${(it.name as string) || ""}`}
      makeEmpty={() => ({ name: "", role: "", bio: "", photo_path: null })}
      itemFields={[
        { key: "name", label: "Name", type: "text" },
        { key: "role", label: "Role", type: "text" },
        { key: "bio", label: "Bio", type: "textarea" },
        { key: "photo_path", label: "Photo", type: "image", folder: "cms" },
      ]}
      extraTopFields={[{ key: "mission", label: "Mission statement", type: "textarea" }]}
      extraBottomFields={[{ key: "closing", label: "Closing line", type: "text" }]}
    />
  ),
});
