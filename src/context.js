import { createContext, useContext } from "react";

export const DataContext = createContext({ user: null, users: [], tasks: [], sectors: [] });

export function useData() {
  const { user, users, tasks, sectors } = useContext(DataContext);
  return {
    user, users, tasks, sectors,
    taskName: (id) => tasks.find((t) => t.id === id)?.name ?? "Sem tarefa",
    userName: (id) => users.find((u) => u.id === id)?.name ?? "—",
    sector: (id) => sectors.find((s) => s.id === id) ?? null,
    isManager: user?.role === "admin" || user?.role === "gestor",
    isAdmin: user?.role === "admin",
  };
}