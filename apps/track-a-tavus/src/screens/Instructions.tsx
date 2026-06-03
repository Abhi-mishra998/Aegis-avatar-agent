import { createConversation } from "@/api";
import {
  DialogWrapper,
  AnimatedTextBlockWrapper,
  StaticTextBlockWrapper,
} from "@/components/DialogWrapper";
import { screenAtom } from "@/store/screens";
import { conversationAtom } from "@/store/conversation";
import React, { useCallback, useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { AlertTriangle, Mic, Video } from "lucide-react";
import { useDaily, useDailyEvent, useDevices } from "@daily-co/daily-react";
import { ConversationError } from "./ConversationError";
import zoomSound from "@/assets/sounds/zoom.mp3";
import { Button } from "@/components/ui/button";
import { apiTokenAtom } from "@/store/tokens";
import { quantum } from 'ldrs';
import gloriaVideo from "@/assets/video/gloria.mp4";

// Register the quantum loader
quantum.register();

const useCreateConversationMutation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setScreenState] = useAtom(screenAtom);
  const [, setConversation] = useAtom(conversationAtom);
  const token = useAtomValue(apiTokenAtom);

  const createConversationRequest = async () => {
    try {
      if (!token) {
        throw new Error("Token is required");
      }
      const conversation = await createConversation(token);
      setConversation(conversation);
      setScreenState({ currentScreen: "conversation" });
    } catch (error) {
      setError(error as string);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createConversationRequest,
  };
};

export const Instructions: React.FC = () => {
  const daily = useDaily();
  const { currentMic, setMicrophone, setSpeaker } = useDevices();
  const { createConversationRequest } = useCreateConversationMutation();
  const [getUserMediaError, setGetUserMediaError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [error, setError] = useState(false);
  const audio = useMemo(() => {
    const audioObj = new Audio(zoomSound);
    audioObj.volume = 0.7;
    return audioObj;
  }, []);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  useDailyEvent(
    "camera-error",
    useCallback(() => {
      setGetUserMediaError(true);
    }, []),
  );

  const handleClick = async () => {
    try {
      setIsLoading(true);
      setIsPlayingSound(true);
      
      audio.currentTime = 0;
      await audio.play();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsPlayingSound(false);
      setIsLoadingConversation(true);
      
      let micDeviceId = currentMic?.device?.deviceId;
      if (!micDeviceId) {
        const res = await daily?.startCamera({
          startVideoOff: false,
          startAudioOff: false,
          audioSource: "default",
        });
        // @ts-expect-error deviceId exists in the MediaDeviceInfo
        const isDefaultMic = res?.mic?.deviceId === "default";
        // @ts-expect-error deviceId exists in the MediaDeviceInfo
        const isDefaultSpeaker = res?.speaker?.deviceId === "default";
        // @ts-expect-error deviceId exists in the MediaDeviceInfo
        micDeviceId = res?.mic?.deviceId;

        if (isDefaultMic) {
          if (!isDefaultMic) {
            setMicrophone("default");
          }
          if (!isDefaultSpeaker) {
            setSpeaker("default");
          }
        }
      }
      if (micDeviceId) {
        await createConversationRequest();
      } else {
        setGetUserMediaError(true);
      }
    } catch (error) {
      console.error(error);
      setError(true);
    } finally {
      setIsLoading(false);
      setIsLoadingConversation(false);
    }
  };

  if (isPlayingSound || isLoadingConversation) {
    return (
      <DialogWrapper>
        <video
          src={gloriaVideo}
          autoPlay
          muted
          loop
          playsInline
          className="fixed inset-0 h-full w-full object-cover"
        />
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <AnimatedTextBlockWrapper>
          <div className="flex flex-col items-center justify-center gap-4">
            <l-quantum
              size="45"
              speed="1.75"
              color="white"
            ></l-quantum>
          </div>
        </AnimatedTextBlockWrapper>
      </DialogWrapper>
    );
  }

  if (error) {
    return <ConversationError onClick={handleClick} />;
  }

  return (
    <DialogWrapper>
      <video
        src={gloriaVideo}
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 h-full w-full object-cover"
      />
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <AnimatedTextBlockWrapper>
        <div className="flex w-full max-w-[560px] flex-col items-center px-4">
          {/* Avatar with AI badge */}
          <div className="relative mb-3">
            <img
              src="/abhishek_face.png"
              alt="Abhishek Mishra, creator of Aegis"
              className="size-20 rounded-full border-2 border-[#9EEAFF] object-cover object-top shadow-[0_0_24px_rgba(158,234,255,0.45)] sm:size-24"
            />
            <span className="absolute -bottom-1 right-0 inline-flex items-center rounded-full border border-yellow-400/60 bg-yellow-400/90 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-black">
              AI
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-center text-2xl font-semibold leading-tight sm:text-3xl"
            style={{ fontFamily: "Source Code Pro, monospace" }}
          >
            <span className="text-white">Meet </span>
            <span style={{ color: "#9EEAFF" }}>Abhishek</span>
            <span className="text-white">.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-1 text-center text-xs text-white/70 sm:text-sm">
            Creator of{" "}
            <a
              href="https://dev.aegisagent.in"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              Aegis
            </a>{" "}
            — the safety layer for AI agents
          </p>

          {/* Description */}
          <p className="mt-3 text-center text-sm text-gray-300">
            Talk face-to-face with Abhishek's AI avatar — ask about the product,
            traction, the ask, anything.
          </p>

          {/* CTA */}
          <Button
            onClick={handleClick}
            className="relative z-20 mt-5 flex items-center justify-center gap-2 rounded-3xl border border-white/30 bg-black/30 px-7 text-sm text-white transition-all duration-200 hover:text-primary disabled:opacity-50"
            disabled={isLoading}
            style={{ height: "44px" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 15px rgba(34, 197, 254, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <Video className="size-4" />
            Talk to Abhishek
          </Button>

          {/* Mic-error toast (inline; only visible if camera/mic blocked) */}
          {getUserMediaError && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-400/60 bg-red-500/90 px-3 py-2 text-xs text-white backdrop-blur-sm">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Mic & camera access required — check browser settings.</span>
            </div>
          )}

          {/* Permission hint + Terms — one tight line, flows in document, no overlap */}
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-gray-400">
            <span className="inline-flex items-center gap-1">
              <Mic className="size-3 text-primary" /> mic
            </span>
            <span className="inline-flex items-center gap-1">
              <Video className="size-3 text-primary" /> camera
            </span>
            <span className="hidden sm:inline">·</span>
            <span>
              By talking, you accept the{" "}
              <a href="#" className="text-primary hover:underline">Terms</a>
              {" "}&{" "}
              <a href="#" className="text-primary hover:underline">Privacy</a>.
            </span>
          </p>
        </div>
      </AnimatedTextBlockWrapper>
    </DialogWrapper>
  );
};

export const PositiveFeedback: React.FC = () => {
  return (
    <DialogWrapper>
      <AnimatedTextBlockWrapper>
        <StaticTextBlockWrapper
          imgSrc="/images/positive.png"
          title="Great Conversation!"
          titleClassName="sm:max-w-full bg-[linear-gradient(91deg,_#43BF8F_16.63%,_#FFF_86.96%)]"
          description="Thanks for the engaging discussion. Feel free to come back anytime for another chat!"
        />
      </AnimatedTextBlockWrapper>
    </DialogWrapper>
  );
};
