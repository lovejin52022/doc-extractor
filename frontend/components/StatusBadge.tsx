const STATUS_LABEL: Record<string, string> = {
  pending: "等待处理",
  processing: "处理中",
  completed: "已完成",
  failed: "失败",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-pill status-${status}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
