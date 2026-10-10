import TicketQueue from "../components/TicketQueue";

const UnassignedTicketsPage = () => (
  <TicketQueue
    endpoint="/tickets/unassigned"
    title="Unassigned Tickets"
    subtitle="View all tickets that are waiting to be assigned to an agent."
    errorMessage="Failed to load unassigned tickets."
  />
);

export default UnassignedTicketsPage;
