import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import api from "../services/api";
import toast from 'react-hot-toast';

const TicketFormPage = () => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
  });

  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("priority", form.priority);

      if (attachment) {
        formData.append("attachment", attachment);
      }

      await api.post("/tickets", formData);
      toast.success("Ticket created successfully!");
      navigate("/dashboard");
    } catch (err) {
      // If the backend sends an array of specific validation errors, display the first one
      if (err?.response?.data?.errors && err.response.data.errors.length > 0) {
        setError(err.response.data.errors[0].msg);
      } else {
        setError(err?.response?.data?.message || "Unable to create ticket");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl page-enter relative z-10 animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">Create a Support Ticket</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
          Describe your issue clearly so our team can resolve it quickly.
        </p>
      </div>

      <div className="glass-card shadow-soft p-8">
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-500 flex items-center gap-2 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Ticket Title"
            required
            placeholder="e.g. Cannot access the billing dashboard"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <label className="block text-sm text-slate-300">
            <span className="mb-2 block font-medium text-slate-700 dark:text-slate-300">Description</span>
            <textarea
              required
              placeholder="Please provide as much detail as possible..."
              className="input-premium min-h-[160px] resize-y"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-slate-700 dark:text-slate-300">Priority Level</span>
              <div className="relative">
                <select
                  className="input-premium appearance-none cursor-pointer"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">Low (General Inquiry)</option>
                  <option value="medium">Medium (Standard Issue)</option>
                  <option value="high">High (System Impacting)</option>
                  <option value="urgent">Urgent (Critical Outage)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium text-slate-700 dark:text-slate-300">File Attachment (Optional)</span>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer group">
                  <div className="input-premium border-dashed border-2 flex items-center justify-center gap-2 group-hover:border-primary-500 group-hover:bg-primary-500/5 transition-all">
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-slate-500 group-hover:text-primary-500 font-medium transition-colors">
                      {attachment ? attachment.name : "Choose a file to upload"}
                    </span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setAttachment(e.target.files[0])}
                  />
                </label>
                {attachment && (
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); setAttachment(null); }}
                    className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </label>
          </div>

          <div className="pt-4 mt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => navigate('/dashboard')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
              {isLoading ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              ) : (
                <>
                  Submit Ticket
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketFormPage;
