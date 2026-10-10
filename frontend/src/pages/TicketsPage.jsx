import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import Button from "../components/Button";
import TicketQueue from "../components/TicketQueue";
import { useAuth } from "../context/AuthContext";

// Full ticket list: every ticket for admins, the organization's for clients
const TicketsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isClient = user?.role === "client";

  return (
    <TicketQueue
      endpoint="/tickets"
      title={isClient ? "My Tickets" : "All Tickets"}
      subtitle={
        isClient
          ? "Every support request from your organization."
          : "Every ticket in the system. Filter to find what needs attention."
      }
      errorMessage="Failed to load tickets."
      action={
        isClient ? (
          <Button onClick={() => navigate("/tickets/new")} className="flex items-center gap-2 whitespace-nowrap">
            <FaPlus className="w-3 h-3" />
            New Ticket
          </Button>
        ) : null
      }
    />
  );
};

export default TicketsPage;
