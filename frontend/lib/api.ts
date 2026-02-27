import axios from "axios";

const api = axios.create({
  baseURL: "https://fantasy-ruby.vercel.app/api",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
}

export interface Player {
  id: number;
  name: string;
  position: string;
  team_name: string;
  price: number;
  total_points: number;
  is_active: boolean;
  // السطر اللي جاي هو اللي هيحل الإيرور
  image_url?: string; 
}

export interface Gameweek {
  id: number;
  number: number;
  name: string;
  deadline: string;
  is_active: boolean;
  is_finished: boolean;
  is_voting_open: boolean; // 👈 السطر الجديد اللي هيحل الإيرور
}

export interface FantasyTeam {
  id: number;
  name: string;
  budget_remaining: number;
  total_points: number;
  free_transfers: number;
}

export interface LeaderboardEntry {
  rank: number;
  manager_name: string;
  team_name: string;
  total_points: number;
}

export interface MiniLeague {
  id: number;
  name: string;
  join_code: string;
  created_by: number;
}

export interface MiniLeagueMemberEntry {
  rank: number;
  manager_name: string;
  team_name: string;
  total_points: number;
}