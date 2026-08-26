import { AdminConsole } from "@/components/admin/admin-console";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section = [] } = await params;
  return <AdminConsole initialRoute={section.join("/")} />;
}
