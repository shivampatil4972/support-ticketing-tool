import toast from "react-hot-toast";
import api from "./api";

// Attachments sit behind authentication, so a plain <a href> cannot reach
// them. Fetch the file with the JWT and hand the browser a blob URL instead.
export const openAttachment = async (path, { download = false, filename = "attachment" } = {}) => {
  try {
    const response = await api.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);

    const link = document.createElement("a");
    link.href = url;

    if (download) {
      link.download = filename;
    } else {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    document.body.appendChild(link);
    link.click();
    link.remove();

    // Give the new tab time to load before releasing the blob
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch {
    toast.error("Failed to open attachment.");
  }
};

export const ticketAttachmentPath = (ticketId) => `/tickets/${ticketId}/attachment`;

export const commentAttachmentPath = (ticketId, commentId) =>
  `/tickets/${ticketId}/comments/${commentId}/attachment`;
