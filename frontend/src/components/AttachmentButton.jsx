import { openAttachment, ticketAttachmentPath } from "../services/attachments";

// Paperclip cell for ticket tables
const AttachmentButton = ({ ticket }) => {
  if (!ticket.attachment_path) {
    return <span className="text-slate-300 dark:text-slate-600">—</span>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openAttachment(ticketAttachmentPath(ticket.id));
      }}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-primary-500 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30 transition-colors"
      title="View Attachment"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
    </button>
  );
};

export default AttachmentButton;
