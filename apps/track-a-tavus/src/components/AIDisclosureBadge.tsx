import { Sparkles } from "lucide-react";

/**
 * Persistent EU AI Act Article 50 disclosure.
 * Article 50(4): "Deployers of an AI system that generates or manipulates
 * image, audio or video content constituting a deep fake, shall disclose
 * that the content has been artificially generated or manipulated."
 * Applies from 2 August 2026. Keep visible during every avatar conversation.
 */
export const AIDisclosureBadge = ({
  className = "",
}: {
  className?: string;
}) => (
  <div
    aria-label="AI-generated avatar disclosure"
    className={
      "pointer-events-none flex items-center gap-1.5 rounded-full border border-yellow-400/40 bg-yellow-400/15 px-3 py-1 text-xs font-medium text-yellow-200 backdrop-blur " +
      className
    }
  >
    <Sparkles className="size-3" />
    <span>AI-generated avatar — synthetic media</span>
  </div>
);
