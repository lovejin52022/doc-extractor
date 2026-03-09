export default function LoadingState({ text = "加载中..." }: { text?: string }) {
  return <p className="muted">{text}</p>;
}
