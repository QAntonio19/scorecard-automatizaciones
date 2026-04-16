"use client";

import { useState } from "react";
import { devFrameworkTabs } from "@/lib/devFrameworkSections";

function Block({
  block,
}: {
  block: (typeof devFrameworkTabs)[number]["blocks"][number];
}) {
  if (block.kind === "title") {
    return <h2 className="text-2xl font-bold text-slate-900">{block.text}</h2>;
  }
  if (block.kind === "subtitle") {
    return <p className="text-sm text-slate-600">{block.text}</p>;
  }
  if (block.kind === "paragraph") {
    return <p className="text-sm leading-relaxed text-slate-700">{block.text}</p>;
  }
  if (block.kind === "list") {
    return (
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  const isSky = block.tone === "sky";
  return (
    <div
      className={`rounded-xl border p-4 ${
        isSky
          ? "border-sky-200 bg-sky-50/80"
          : "border-amber-200 bg-amber-50/80"
      }`}
    >
      {block.title ? (
        <p className="text-xs font-bold uppercase tracking-wide text-amber-900/80">{block.title}</p>
      ) : null}
      <p
        className={`text-sm font-semibold leading-snug ${
          isSky ? "border-l-4 border-sky-600 pl-3 text-sky-950" : "text-amber-950"
        }`}
      >
        {block.text}
      </p>
    </div>
  );
}

export function DevFrameworkTabs() {
  const [active, setActive] = useState(devFrameworkTabs[0].id);
  const tab = devFrameworkTabs.find((t) => t.id === active) ?? devFrameworkTabs[0];

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border-b border-slate-200">
        <nav className="flex min-w-max gap-1 px-1">
          {devFrameworkTabs.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "border-sky-600 text-sky-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span aria-hidden>{t.icon}</span>
                <span className="whitespace-nowrap">{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-700">
          <span className="text-2xl" aria-hidden>
            {tab.icon}
          </span>
          <span className="text-sm font-semibold text-slate-500">{tab.short}</span>
        </div>
        <div className="space-y-4">
          {tab.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
