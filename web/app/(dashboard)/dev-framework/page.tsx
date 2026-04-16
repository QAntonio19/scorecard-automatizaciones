import { DevFrameworkTabs } from "@/components/dev-framework/DevFrameworkTabs";

export default function DevFrameworkPage() {
  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dev Framework</h1>
        <p className="mt-2 text-sm text-slate-600">
          Metodología ITAI para construir aplicaciones web seguras
        </p>
      </header>
      <DevFrameworkTabs />
    </div>
  );
}
