import { memo } from "react";
import { Button } from "./ui/button";
import { Settings, Check } from "lucide-react";
import { useAtom } from "jotai";
import { screenAtom } from "@/store/screens";
import { conversationAtom } from "@/store/conversation";
import { settingsSavedAtom } from "@/store/settings";

export const Header = memo(() => {
  const [, setScreenState] = useAtom(screenAtom);
  const [conversation] = useAtom(conversationAtom);
  const [settingsSaved] = useAtom(settingsSavedAtom);

  const handleSettings = () => {
    if (!conversation) {
      setScreenState({ currentScreen: "settings" });
    }
  };

  return (
    <header className="flex w-full items-start justify-between" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center gap-2.5">
        <img
          src="/abhishek_face.png"
          alt="Abhishek Mishra, creator of Aegis"
          className="h-8 w-8 rounded-full border border-[#9EEAFF]/60 object-cover object-top sm:h-10 sm:w-10"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-white sm:text-base">
            Aegis
          </span>
          <span className="text-[10px] text-white/60 sm:text-xs">
            Talk to Abhishek
          </span>
        </div>
      </div>
      <div className="relative">
        {settingsSaved && (
          <div className="absolute -top-2 -right-2 z-20 rounded-full bg-green-500 p-1 animate-fade-in">
            <Check className="size-3" />
          </div>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={handleSettings}
          className="relative size-10 sm:size-14 border-0 bg-transparent hover:bg-zinc-800"
        >
          <Settings className="size-4 sm:size-6" />
        </Button>
      </div>
    </header>
  );
});
