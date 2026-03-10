import { createContext, useContext, type PropsWithChildren } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchMe, loginUser, logoutUser, queryKeys, refreshCurrentUser } from "@/api/queries";
import type { User } from "@/types/domain";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchMe,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, null);
    },
  });

  async function refetchUser() {
    try {
      const user = await queryClient.fetchQuery({
        queryKey: queryKeys.me,
        queryFn: refreshCurrentUser,
      });
      queryClient.setQueryData(queryKeys.me, user);
      return user;
    } catch {
      queryClient.setQueryData(queryKeys.me, null);
      return null;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: data ?? null,
        isLoading,
        isLoggingIn: loginMutation.isPending,
        isLoggingOut: logoutMutation.isPending,
        login: loginMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
