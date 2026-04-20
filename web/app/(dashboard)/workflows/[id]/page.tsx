import { notFound } from "next/navigation";
import { ApiBackendMissingEnv, ApiBackendUnreachable } from "@/components/deployment/ApiBackendNotice";
import { WorkflowDetailShell } from "@/components/proyectos/WorkflowDetailShell";
import { fetchProjectById, isApiNotConfiguredError } from "@/lib/projectsApi";

type PageProps = { params: Promise<{ id: string }> };

export default async function WorkflowDetallePage({ params }: PageProps) {
  const { id } = await params;
  let p: Awaited<ReturnType<typeof fetchProjectById>>;
  try {
    p = await fetchProjectById(id);
  } catch (e) {
    if (isApiNotConfiguredError(e)) {
      return (
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <ApiBackendMissingEnv />
        </div>
      );
    }
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <ApiBackendUnreachable />
      </div>
    );
  }
  if (!p) notFound();

  return <WorkflowDetailShell project={p} />;
}
