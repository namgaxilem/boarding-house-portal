"use client";

import { http } from "@/lib/http";
import { User } from "@/types/User";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface ContextProps {
  user?: User;
  loading: boolean;
  profileAvatarUrl?: string;
  getUserInfo: () => void;
  logoutClient: () => void;
  setProfileAvatar: (profileImage: string) => void;
  setCurrentUser: (user: User) => void;
}
export const AuthContext = createContext({} as ContextProps);

export const useAuth = () => {
  return useContext(AuthContext);
};

export default function AuthProvider({ children }) {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<any>();

  const getUserInfo = useCallback(() => {
    setLoading(true);
    http
      .get<any>("/api/users/me")
      .then((data) => {
        setUser(data?.findUserInfo);
        setProfileAvatarUrl(data?.findUserInfo?.profileImageURL);
      })
      .finally(() => setLoading(false));
  }, []);

  const setProfileAvatar = (newAvatarLink: string) => {
    if (newAvatarLink) {
      setProfileAvatarUrl(newAvatarLink);
    }
  };

  const setCurrentUser = (user: User) => {
    setUser(user);
  };

  const logoutClient = useCallback(() => {
    setUser(undefined);
    setProfileAvatarUrl(undefined);
  }, []);

  useEffect(() => {
    getUserInfo();
  }, [getUserInfo]);

  useEffect(() => {}, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        getUserInfo,
        logoutClient,
        profileAvatarUrl,
        setProfileAvatar,
        setCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
