import type { ChatMessage as ChatMessageData } from "../../types/jarvis";

export function ChatMessage({ message }: { message: ChatMessageData }) {
  return (
    <article className={message.author === "JARVIS" ? "message message--jarvis" : "message"}>
      <strong>{message.author}</strong>
      <p>{message.text}</p>
    </article>
  );
}
