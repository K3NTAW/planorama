import { create } from 'zustand';

interface ProfileState {
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  loading: true,
  setLoading: (loading) => set({ loading }),
})); 