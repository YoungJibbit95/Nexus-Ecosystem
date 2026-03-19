// base44Client.js — stub (base44 backend removed)
// All entity operations now use localStorage via the Editor component.
// This file exists only to satisfy any remaining imports.

export const base44 = {
  entities: {},
  auth: {
    me: () => Promise.reject(new Error("No auth backend")),
    logout: () => {},
    redirectToLogin: () => {},
  },
};
