"use client";

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = "请确认",
  message,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal>
      <div className="dialog-card">
        <h3>{title}</h3>
        <p className="muted">{message}</p>
        <div className="actions" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>{cancelText}</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
