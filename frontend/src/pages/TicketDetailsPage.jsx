import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Loader from "../components/Loader";
import StatusBadge from "../components/StatusBadge";
import Button from "../components/Button";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { openAttachment, ticketAttachmentPath, commentAttachmentPath } from "../services/attachments";
import toast from 'react-hot-toast';
import { FaPaperclip, FaDownload, FaLock, FaReply, FaArrowLeft, FaUserCircle, FaBuilding } from "react-icons/fa";

const TicketDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState("");
  const [internalMessage, setInternalMessage] = useState("");
  const [status, setStatus] = useState("");
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [agentsError, setAgentsError] = useState("");
  const [replyFile, setReplyFile] = useState(null);
  const [noteFile, setNoteFile] = useState(null);

  // Replies and notes go as multipart so they can carry an attachment
  const buildCommentPayload = (text, file) => {
    const formData = new FormData();
    formData.append("message", text.trim());
    if (file) formData.append("attachment", file);
    return formData;
  };

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/tickets/${id}`);
      const ticketData = response.data.data.ticket;
      setTicket(ticketData);
      setComments(response.data.data.comments || []);
      setStatus(ticketData.status || "open");
      setSelectedAgent(ticketData.assigned_agent_id || "");
    } catch (error) {
      if (error.response?.status === 403) setError("You are not allowed to view this ticket.");
      else if (error.response?.status === 404) setError("Ticket not found.");
      else setError(error.response?.data?.message || "Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    if (user?.role !== "admin") return;
    try {
      setAgentsError("");
      const response = await api.get("/admin/users");
      const users = response.data.data || [];
      const agentUsers = users.filter((item) => item.role === "agent" && item.is_active === 1);
      setAgents(agentUsers);
    } catch (error) {
      setAgentsError("Failed to load agents.");
    }
  };

  useEffect(() => {
    if (!user) return;
    loadTicket();
    loadAgents();
  }, [id, user]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      setActionLoading(true);
      await api.patch(`/tickets/${id}/status`, { status: newStatus });
      setStatus(newStatus);
      toast.success("Ticket status updated");
      await loadTicket();
    } catch (error) {
      toast.error("Failed to update ticket status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAgent) return toast.error("Please select an agent.");
    try {
      setActionLoading(true);
      await api.patch(`/tickets/${id}/assign`, { assigned_agent_id: selectedAgent });
      toast.success("Ticket assigned successfully");
      await loadTicket();
    } catch (error) {
      toast.error("Failed to assign ticket.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    try {
      setActionLoading(true);
      await api.delete(`/tickets/${id}`);
      toast.success("Ticket deleted");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to delete ticket.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      setActionLoading(true);
      await api.post(`/tickets/${id}/reply`, buildCommentPayload(message, replyFile));
      setMessage("");
      setReplyFile(null);
      toast.success("Reply posted");
      await loadTicket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reply.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInternalNote = async (e) => {
    e.preventDefault();
    if (!internalMessage.trim()) return;
    try {
      setActionLoading(true);
      await api.post(`/tickets/${id}/internal-note`, buildCommentPayload(internalMessage, noteFile));
      setInternalMessage("");
      setNoteFile(null);
      toast.success("Internal note added");
      await loadTicket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add internal note.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loader size="large" />;

  if (!ticket) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-500 flex items-center justify-center font-medium animate-fade-in-up">
        {error || "Ticket not found."}
      </div>
    );
  }

  const attachmentPath = ticket.attachment_path ? ticketAttachmentPath(ticket.id) : null;

  // File picker shared by the reply and internal note forms
  const renderFilePicker = (file, setFile) => (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary-500 transition-colors cursor-pointer min-w-0">
      <FaPaperclip className="w-4 h-4 flex-shrink-0" />
      <span className="truncate max-w-[12rem]">{file ? file.name : "Attach file"}</span>
      <input
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
        onChange={(e) => {
          setFile(e.target.files[0] || null);
          e.target.value = "";
        }}
      />
      {file && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setFile(null); }}
          className="text-xs text-red-500 hover:underline"
        >
          Remove
        </button>
      )}
    </label>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter relative z-10 animate-fade-in-up">
      
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-slate-500 hover:text-primary-500 transition-colors font-medium text-sm w-max"
      >
        <FaArrowLeft /> Back to List
      </button>

      {/* Ticket Header Card */}
      <div className="glass-card shadow-soft p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md uppercase tracking-wider">
                TKT-{ticket.id}
              </span>
              <StatusBadge status={ticket.status} />
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                ticket.priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
                ticket.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                ticket.priority === 'medium' ? 'bg-blue-500/10 text-blue-500' :
                'bg-emerald-500/10 text-emerald-500'
              }`}>
                {ticket.priority} Priority
              </span>
            </div>
            
            <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white mb-4">
              {ticket.title}
            </h1>
            
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1128] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed shadow-inner">
              {ticket.description}
            </div>
          </div>

          {/* Meta Info Panel */}
          <div className="w-full md:w-72 flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1128] border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Ticket Details</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FaUserCircle className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Created By</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{ticket.clientName || 'Unknown Client'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FaBuilding className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Organization</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{ticket.organization_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-500 text-xs font-bold mt-0.5">A</div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Assigned To</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{ticket.agentName || 'Unassigned'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        {(user?.role === "agent" || user?.role === "admin") && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Status Change */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Update Status
              </label>
              <div className="relative">
                <select
                  value={status}
                  onChange={handleStatusChange}
                  disabled={actionLoading}
                  className="input-premium appearance-none pr-10"
                >
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Admin Controls */}
            {user?.role === "admin" && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Assign Agent
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        disabled={actionLoading}
                        className="input-premium appearance-none pr-10 w-full"
                      >
                        <option value="">Select Agent</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                    <Button onClick={handleAssign} disabled={actionLoading || !selectedAgent} className="px-4 py-2">
                      Assign
                    </Button>
                  </div>
                </div>

                <div className="flex items-end justify-end">
                  <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
                    Delete Ticket
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Attachment Card */}
      {attachmentPath && (
        <div className="glass-card shadow-soft p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-500 flex items-center justify-center">
              <FaPaperclip className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">{ticket.attachment_path}</p>
              <p className="text-xs text-slate-500">Attached File</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button type="button" onClick={() => openAttachment(attachmentPath)} className="btn-secondary w-full md:w-auto text-center px-4 py-2">
              View File
            </button>
            <button type="button" onClick={() => openAttachment(attachmentPath, { download: true, filename: ticket.attachment_path })} className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2">
              <FaDownload /> Download
            </button>
          </div>
        </div>
      )}

      {/* Conversation Thread */}
      <div className="glass-card shadow-soft overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0A1128]/50">
          <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Activity Thread</h3>
        </div>

        <div className="p-6 space-y-6">
          {comments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <FaReply className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No replies yet. Be the first to respond.</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className={`flex gap-4 ${comment.is_internal ? 'opacity-90' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white shadow-md overflow-hidden bg-slate-100 dark:bg-slate-800`}>
                  <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(comment.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`} alt={comment.name} className="w-full h-full object-cover" />
                </div>
                
                <div className={`flex-1 rounded-2xl p-5 shadow-sm ${
                  comment.is_internal 
                    ? 'bg-amber-500/10 border border-amber-500/20 rounded-tl-none' 
                    : 'bg-slate-50 dark:bg-[#0A1128] border border-slate-200 dark:border-slate-800 rounded-tl-none'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{comment.name}</span>
                      <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full capitalize">
                        {comment.role}
                      </span>
                      {comment.is_internal && (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <FaLock className="w-3 h-3" /> Internal Note
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                      {new Date(comment.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                    {comment.message}
                  </div>
                  {comment.attachment_path && (
                    <button
                      type="button"
                      onClick={() => openAttachment(commentAttachmentPath(ticket.id, comment.id))}
                      className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors"
                    >
                      <FaPaperclip className="w-3 h-3" /> View attachment
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reply Forms area */}
        <div className="bg-slate-50 dark:bg-[#050A18] border-t border-slate-200 dark:border-slate-800 p-6 space-y-6">
          
          {/* Internal Note (Agents/Admins) */}
          {(user?.role === "agent" || user?.role === "admin") && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-inner">
              <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-500 font-bold">
                <FaLock /> Add Internal Note
              </div>
              <p className="text-xs text-slate-500 mb-4 font-medium">This note is completely hidden from the client.</p>
              <form onSubmit={handleInternalNote}>
                <textarea
                  className="input-premium min-h-[100px] mb-3 !bg-white/50 dark:!bg-black/20 !border-amber-500/30 focus:!border-amber-500"
                  placeholder="Type internal observations here..."
                  value={internalMessage}
                  onChange={(e) => setInternalMessage(e.target.value)}
                />
                <div className="flex items-center justify-between gap-4">
                  {renderFilePicker(noteFile, setNoteFile)}
                  <Button type="submit" disabled={actionLoading || !internalMessage.trim()} className="!bg-amber-500 hover:!bg-amber-600 shadow-none px-4 py-2">
                    Save Note
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Public Reply */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-3">Send Reply</h4>
            <form onSubmit={handleReply}>
              <textarea
                className="input-premium min-h-[120px] mb-3"
                placeholder="Type your response to the client..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="flex items-center justify-between gap-4">
                {renderFilePicker(replyFile, setReplyFile)}
                <Button type="submit" disabled={actionLoading || !message.trim()} className="flex items-center gap-2 px-6">
                  <FaReply className="w-4 h-4" /> Post Reply
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailsPage;