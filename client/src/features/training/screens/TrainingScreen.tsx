import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ChatPanel from "../components/ChatPanel";
import CodePanel from "../../editor/components/CodePanel";
import MusicTraining from "../components/MusicTraining";
import FloatingEditor from "../../editor/components/FloatingEditor";
import ResizeHandle from "../components/ResizeHandle";
import useChat from "../hooks/useChat";
import { createSession, getSession, reactivateSession } from "../services/session.service";
import { getUserSkill } from "../../skills/services/skill.service";
import Spinner from "../../../components/shared/Spinner";
import { isTechCategory, isMusicCategory } from "../../../utils/skillCategories";
import type { Session, SessionType } from "../types/session.types";
import type { UserSkill } from "../../skills/types/skill.types";
import "./TrainingScreen.scss";

export default function TrainingScreen() {
  const { skillId, sessionId } = useParams<{
    skillId: string;
    sessionId?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [skill, setSkill] = useState<UserSkill | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [starterCode, setStarterCode] = useState("");
  const [editorLanguage, setEditorLanguage] = useState<string | undefined>(
    undefined,
  );
  const [editorCode, setEditorCode] = useState("");
  const [splitPercent, setSplitPercent] = useState(60);
  const [editorFloating, setEditorFloating] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);

  const [sessionCompleted, setSessionCompleted] = useState(false);

  const handleToolUse = useCallback(
    (tool: string, input: Record<string, unknown>) => {
      if (tool === "present_problem") {
        if (typeof input.starter_code === "string" && input.starter_code) {
          setStarterCode(input.starter_code);
          setEditorCode(input.starter_code);
        }
        if (typeof input.language === "string" && input.language) {
          setEditorLanguage(input.language);
        }
      }
      if (tool === "set_belt") {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
      if (tool === "complete_session") {
        setSessionCompleted(true);
      }
    },
    [],
  );

  useEffect(() => {
    if (!skillId) return;
    let cancelled = false;

    async function init() {
      try {
        setLoading(true);
        const skillData = await getUserSkill(skillId!);
        if (cancelled) return;
        setSkill(skillData);

        let sess: Session;
        if (sessionId) {
          sess = await getSession(skillId!, sessionId);
        } else {
          const searchParams = new URLSearchParams(location.search);
          const requestedType = (searchParams.get("type") || "training") as SessionType;
          sess = await createSession(skillId!, requestedType);
          if (cancelled) return;
          navigate(`/train/${skillId}/${sess._id}`, { replace: true });
        }
        if (cancelled) return;
        setSession(sess);
      } catch (err: any) {
        if (!cancelled)
          setInitError(
            err.response?.data?.error || "Failed to initialize session",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [skillId, sessionId, navigate]);

  const chat = useChat({
    skillId: skillId || "",
    sessionId: session?._id || "",
    initialMessages: session?.messages || [],
    onToolUse: handleToolUse,
  });

  useEffect(() => {
    if (session?.messages?.length) {
      chat.setMessages(session.messages);
    }
    if (session?.status === 'completed') {
      setSessionCompleted(true);
    }
    // Restore starter code and language from persisted session data on load/refresh
    if (session?.problem?.starterCode && !starterCode) {
      setStarterCode(session.problem.starterCode);
      setEditorCode(session.problem.starterCode);
    }
    if (session?.solution?.language && !editorLanguage) {
      setEditorLanguage(session.solution.language);
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitSolution = (code: string, language: string) => {
    setSubmitting(true);
    const submitMsg = `Here is my solution (${language}):\n\n\`\`\`${language}\n${code}\n\`\`\``;
    chat.sendMessage(submitMsg);
    setSubmitting(false);
  };

  const handleNewSession = async () => {
    setSessionCompleted(false);
    setSession(null);
    setStarterCode('');
    setEditorCode('');
    setEditorLanguage(undefined);
    chat.setMessages([]);

    try {
      setLoading(true);
      const sess = await createSession(skillId!, 'training');
      setSession(sess);
      navigate(`/train/${skillId}/${sess._id}`, { replace: true });
    } catch (err: any) {
      setInitError(err.response?.data?.error || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueSession = async () => {
    if (!skillId || !session) return;
    try {
      await reactivateSession(skillId, session._id);
      setSessionCompleted(false);
    } catch (err: any) {
      setInitError(err.response?.data?.error || 'Failed to reactivate session');
    }
  };

  const { catalogName, showCodeEditor, showMusicEditor, showEditor } = useMemo(() => {
    const name = skill?.skillCatalogId?.name || "Training";
    const category = skill?.skillCatalogId?.category;
    const code = isTechCategory(category);
    const music = isMusicCategory(category);
    return { catalogName: name, showCodeEditor: code, showMusicEditor: music, showEditor: code || music };
  }, [skill?.skillCatalogId?.name, skill?.skillCatalogId?.category]);

  // Default to 50% split when music editor is first shown
  const hasSetMusicDefault = useRef(false);
  useEffect(() => {
    if (showMusicEditor && !hasSetMusicDefault.current) {
      hasSetMusicDefault.current = true;
      setSplitPercent(50);
    }
  }, [showMusicEditor]);

  if (loading) {
    return (
      <div className="TrainingScreen TrainingScreen--loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="TrainingScreen TrainingScreen--error">
        <p>{initError}</p>
      </div>
    );
  }

  return (
    <div className="TrainingScreen">
      <div className="TrainingScreen__header">
        <h2>{catalogName}</h2>
        <span
          className={`TrainingScreen__type ${session?.type === "assessment" ? "TrainingScreen__type--assessment" : ""}`}
        >
          {session?.type}
        </span>
        {skill?.assessmentAvailable && session?.type !== "assessment" && (
          <span className="TrainingScreen__assessBadge">
            Assessment Available
          </span>
        )}
      </div>
      <div className="TrainingScreen__split" ref={splitRef}>
        <div
          className="TrainingScreen__chatPane"
          style={{ width: !showEditor || (showCodeEditor && editorFloating) ? '100%' : `${splitPercent}%` }}
        >
          <ChatPanel
            messages={chat.messages}
            streaming={chat.streaming}
            error={chat.error}
            onSend={chat.sendMessage}
            sessionCompleted={sessionCompleted}
            onNewSession={handleNewSession}
            onContinueSession={handleContinueSession}
          />
        </div>
        {showCodeEditor && !editorFloating && (
          <>
            <ResizeHandle onResize={setSplitPercent} containerRef={splitRef} />
            <div
              className="TrainingScreen__editorPane"
              style={{ width: `${100 - splitPercent}%` }}
            >
              <CodePanel
                language={
                  editorLanguage ||
                  session?.solution?.language ||
                  catalogName.toLowerCase()
                }
                starterCode={starterCode}
                code={editorCode}
                onCodeChange={setEditorCode}
                onSubmit={handleSubmitSolution}
                submitting={submitting || chat.streaming}
                onPopOut={() => setEditorFloating(true)}
              />
            </div>
          </>
        )}
        {showMusicEditor && (
          <MusicTraining
            notation={starterCode}
            sendMessage={chat.sendMessage}
            streaming={chat.streaming}
            splitPercent={splitPercent}
            onResize={setSplitPercent}
            splitRef={splitRef}
          />
        )}
      </div>
      {showCodeEditor && editorFloating && (
        <FloatingEditor onDock={() => setEditorFloating(false)}>
          <CodePanel
            language={
              editorLanguage ||
              session?.solution?.language ||
              catalogName.toLowerCase()
            }
            starterCode={starterCode}
            code={editorCode}
            onCodeChange={setEditorCode}
            onSubmit={handleSubmitSolution}
            submitting={submitting || chat.streaming}
            compact
          />
        </FloatingEditor>
      )}
    </div>
  );
}
