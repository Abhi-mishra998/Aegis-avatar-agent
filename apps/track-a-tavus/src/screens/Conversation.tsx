import { DialogWrapper } from "@/components/DialogWrapper";
import {
  DailyAudio,
  useDaily,
  useLocalSessionId,
  useParticipantIds,
  useVideoTrack,
  useAudioTrack,
} from "@daily-co/daily-react";
import React, { useCallback, useEffect, useState } from "react";
import Video from "@/components/Video";
import { conversationAtom } from "@/store/conversation";
import { useAtom, useAtomValue } from "jotai";
import { screenAtom } from "@/store/screens";
import { Button } from "@/components/ui/button";
import { endConversation } from "@/api/endConversation";
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  PhoneIcon,
} from "lucide-react";
import {
  clearSessionTime,
  getSessionTime,
  setSessionStartTime,
  updateSessionEndTime,
} from "@/utils";
import { Timer } from "@/components/Timer";
import { AIDisclosureBadge } from "@/components/AIDisclosureBadge";
import { TIME_LIMIT } from "@/config";
import { niceScoreAtom } from "@/store/game";
import { naughtyScoreAtom } from "@/store/game";
import { apiTokenAtom } from "@/store/tokens";
import { quantum } from 'ldrs';
import { cn } from "@/lib/utils";

quantum.register();

const timeToGoPhrases = [
  "I'll need to dash off soon—let's make these last moments count.",
  "I'll be heading out soon, but I've got a little more time for you!",
  "I'll be leaving soon, but I'd love to hear one more thing before I go!",
];

const outroPhrases = [
  "It's time for me to go now. Take care, and I'll see you soon!",
  "I've got to get back to work. See you next time!",
  "I must say goodbye for now. Stay well, and I'll see you soon!",
];

export const Conversation: React.FC = () => {
  const [conversation, setConversation] = useAtom(conversationAtom);
  const [, setScreenState] = useAtom(screenAtom);
  const [naughtyScore] = useAtom(naughtyScoreAtom);
  const [niceScore] = useAtom(niceScoreAtom);
  const token = useAtomValue(apiTokenAtom);

  const daily = useDaily();
  const localSessionId = useLocalSessionId();
  const localVideo = useVideoTrack(localSessionId);
  const localAudio = useAudioTrack(localSessionId);
  const isCameraEnabled = !localVideo.isOff;
  const isMicEnabled = !localAudio.isOff;
  const remoteParticipantIds = useParticipantIds({ filter: "remote" });
  const [start, setStart] = useState(false);

  useEffect(() => {
    if (remoteParticipantIds.length && !start) {
      setStart(true);
      setTimeout(() => daily?.setLocalAudio(true), 4000);
    }
  }, [remoteParticipantIds, start]);

  useEffect(() => {
    if (!remoteParticipantIds.length || !start) return;

    setSessionStartTime();
    const interval = setInterval(() => {
      const time = getSessionTime();
      if (time === TIME_LIMIT - 60) {
        daily?.sendAppMessage({
          message_type: "conversation",
          event_type: "conversation.echo",
          conversation_id: conversation?.conversation_id,
          properties: {
            modality: "text",
            text:
              timeToGoPhrases[Math.floor(Math.random() * 3)] ??
              timeToGoPhrases[0],
          },
        });
      }
      if (time === TIME_LIMIT - 10) {
        daily?.sendAppMessage({
          message_type: "conversation",
          event_type: "conversation.echo",
          conversation_id: conversation?.conversation_id,
          properties: {
            modality: "text",
            text:
              outroPhrases[Math.floor(Math.random() * 3)] ?? outroPhrases[0],
          },
        });
      }
      if (time >= TIME_LIMIT) {
        leaveConversation();
        clearInterval(interval);
      } else {
        updateSessionEndTime();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [remoteParticipantIds, start]);

  useEffect(() => {
    if (conversation?.conversation_url) {
      daily
        ?.join({
          url: conversation.conversation_url,
          startVideoOff: false,
          startAudioOff: true,
        })
        .then(() => {
          daily?.setLocalVideo(true);
          daily?.setLocalAudio(false);
        });
    }
  }, [conversation?.conversation_url]);

  const toggleVideo = useCallback(() => {
    daily?.setLocalVideo(!isCameraEnabled);
  }, [daily, isCameraEnabled]);

  const toggleAudio = useCallback(() => {
    daily?.setLocalAudio(!isMicEnabled);
  }, [daily, isMicEnabled]);

  const leaveConversation = useCallback(() => {
    daily?.leave();
    daily?.destroy();
    if (conversation?.conversation_id && token) {
      endConversation(token, conversation.conversation_id);
    }
    setConversation(null);
    clearSessionTime();

    const naughtyScorePositive = Math.abs(naughtyScore);
    if (naughtyScorePositive > niceScore) {
      setScreenState({ currentScreen: "finalScreen" });
    } else {
      setScreenState({ currentScreen: "finalScreen" });
    }
  }, [daily, token]);

  return (
    <DialogWrapper>
      <div className="absolute inset-0 size-full">
        {remoteParticipantIds?.length > 0 ? (
          <>
            <Timer />
            <AIDisclosureBadge className="absolute left-4 top-4 z-20" />

            {/* "Avatar of" identity badge — visible during the call so the viewer always sees who this is supposed to be */}
            <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/20 bg-black/55 px-2 py-1 backdrop-blur-sm">
              <img
                src="/abhishek_face.png"
                alt="Abhishek Mishra"
                className="size-7 rounded-full border border-[#9EEAFF]/60 object-cover object-top"
              />
              <div className="flex flex-col leading-tight pr-2">
                <span className="text-[11px] font-semibold text-white">
                  Abhishek Mishra
                </span>
                <span className="text-[9px] text-white/60">AI avatar · Aegis</span>
              </div>
            </div>

            <Video
              id={remoteParticipantIds[0]}
              className="size-full"
              tileClassName="!object-cover"
            />
          </>
        ) : (
          // Loading state — show Abhishek's photo so the viewer knows who's about to appear
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-black/40">
            <div className="relative">
              <img
                src="/abhishek_face.png"
                alt="Abhishek Mishra, creator of Aegis"
                className="size-28 rounded-full border-2 border-[#9EEAFF] object-cover object-top shadow-[0_0_30px_rgba(158,234,255,0.55)] sm:size-36"
              />
              <span className="absolute -bottom-1 right-1 inline-flex items-center rounded-full border border-yellow-400/60 bg-yellow-400/90 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-black">
                AI
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <l-quantum size="32" speed="1.75" color="white"></l-quantum>
              <p className="text-sm text-white/80">
                Connecting to Abhishek's AI avatar…
              </p>
            </div>
          </div>
        )}
        {localSessionId && (
          <Video
            id={localSessionId}
            tileClassName="!object-cover"
            className={cn(
              "absolute bottom-20 right-4 aspect-video h-40 w-24 overflow-hidden rounded-lg border-2 border-[#22C5FE] shadow-[0_0_20px_rgba(34,197,254,0.3)] sm:bottom-12 lg:h-auto lg:w-52"
            )}
          />
        )}
        <div className="absolute bottom-8 right-1/2 z-10 flex translate-x-1/2 justify-center gap-4">
          <Button
            size="icon"
            className="border border-[#22C5FE] shadow-[0_0_20px_rgba(34,197,254,0.2)]"
            variant="secondary"
            onClick={toggleAudio}
          >
            {!isMicEnabled ? (
              <MicOffIcon className="size-6" />
            ) : (
              <MicIcon className="size-6" />
            )}
          </Button>
          <Button
            size="icon"
            className="border border-[#22C5FE] shadow-[0_0_20px_rgba(34,197,254,0.2)]"
            variant="secondary"
            onClick={toggleVideo}
          >
            {!isCameraEnabled ? (
              <VideoOffIcon className="size-6" />
            ) : (
              <VideoIcon className="size-6" />
            )}
          </Button>
          <Button
            size="icon"
            className="bg-[rgba(251,36,71,0.80)] backdrop-blur hover:bg-[rgba(251,36,71,0.60)] border border-[rgba(251,36,71,0.9)] shadow-[0_0_20px_rgba(251,36,71,0.3)]"
            variant="secondary"
            onClick={leaveConversation}
          >
            <PhoneIcon className="size-6 rotate-[135deg]" />
          </Button>
        </div>
        <DailyAudio />
      </div>
    </DialogWrapper>
  );
};