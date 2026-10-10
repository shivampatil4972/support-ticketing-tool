const { sendResponse, handle } = require("../utils/response");

const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllClients,
  createClient,
  updateClient,
  deleteClient,
  getDashboardStats,
} = require("../services/adminService");

// ==========================
// Users
// ==========================

const listUsers = handle(async (req, res) => {
  const users = await getAllUsers();

  return sendResponse(res, 200, true, users, "Users retrieved successfully");
}, "Failed to retrieve users");

const createUserHandler = handle(async (req, res) => {
  const user = await createUser({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
    clientId: req.body.client_id || null,
  });

  return sendResponse(res, 201, true, user, "User created successfully");
}, "Failed to create user");

const updateUserHandler = handle(async (req, res) => {
  const user = await updateUser(req.params.id, {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    client_id: req.body.client_id,
  });

  return sendResponse(res, 200, true, user, "User updated successfully");
}, "Failed to update user");

const deleteUserHandler = handle(async (req, res) => {
  const result = await deleteUser(req.params.id);

  return sendResponse(res, 200, true, result, "User deleted successfully");
}, "Failed to delete user");

// ==========================
// Clients
// ==========================

const listClients = handle(async (req, res) => {
  const clients = await getAllClients();

  return sendResponse(res, 200, true, clients, "Clients retrieved successfully");
}, "Failed to retrieve clients");

const createClientHandler = handle(async (req, res) => {
  const client = await createClient({
    organizationName: req.body.organization_name,
  });

  return sendResponse(res, 201, true, client, "Client created successfully");
}, "Failed to create client");

const updateClientHandler = handle(async (req, res) => {
  const client = await updateClient(
    req.params.id,
    req.body.organization_name,
  );

  return sendResponse(res, 200, true, client, "Client updated successfully");
}, "Failed to update client");

const deleteClientHandler = handle(async (req, res) => {
  const result = await deleteClient(req.params.id);

  return sendResponse(res, 200, true, result, "Client deleted successfully");
}, "Failed to delete client");

// ==========================
// Dashboard Statistics
// ==========================

const dashboard = handle(async (req, res) => {
  const stats = await getDashboardStats();

  return sendResponse(
    res,
    200,
    true,
    stats,
    "Dashboard data fetched successfully",
  );
}, "Failed to fetch dashboard data");

module.exports = {
  listUsers,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
  listClients,
  createClientHandler,
  updateClientHandler,
  deleteClientHandler,
  dashboard,
};
