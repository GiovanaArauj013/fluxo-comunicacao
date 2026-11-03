import { createContext, useContext } from "react";

export const DataContext = createContext({ user: null, users: [], tasks: [] });

export function useData() {
  const { user, users, tasks } = useContext(DataContext);
  return {
    user, users, tasks,
    taskName: (id) => tasks.find((t) => t.id === id)?.name ?? "Sem tarefa",
    userName: (id) => users.find((u) => u.id === id)?.name ?? "—",
  };
}
