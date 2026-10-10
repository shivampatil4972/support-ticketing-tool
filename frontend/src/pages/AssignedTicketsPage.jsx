import TicketQueue from "../components/TicketQueue";

const AssignedTicketsPage = () => (
  <TicketQueue
    endpoint="/tickets/assigned"
    title="Assigned Tickets"
    subtitle="Manage tickets currently assigned to you."
    errorMessage="Failed to load assigned tickets."
  />
);

export default AssignedTicketsPage;
