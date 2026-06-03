import { Sparkles } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="flex w-full items-center justify-between gap-4 text-xs text-white/60">
      <div className="flex items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/15 px-3 py-1 font-medium text-yellow-200">
        <Sparkles className="size-3" />
        <span>AI-generated avatar — synthetic media</span>
      </div>
      <a
        href="https://dev.aegisagent.in"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-white"
      >
        dev.aegisagent.in
      </a>
    </footer>
  );
};
