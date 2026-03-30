// ============================================
// ROLE SELECTION — Public API
// ============================================
// Only export what other features need to consume.
// Internal components, data, and utilities stay private.
// ============================================

export { RoleSelectionPage } from "./components/RoleSelectionPage";
export { useRole } from "./hooks/useRole";
export { RoleProvider } from "./context/RoleContext";
