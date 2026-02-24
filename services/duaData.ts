import duaData from '../dua/data.json';

export interface Dua {
  id: number;
  title: string;
  arabic: string;
  pronunciation: string;
  meaning: string;
  audio: string;
}

export interface DuaCategory {
  id: number;
  title: string;
  total_duas: number;
  duas: Dua[];
}

export const getDuaCategories = (): DuaCategory[] => {
  return duaData.categories || [];
};

export const getDuaCategoryById = (id: number): DuaCategory | undefined => {
  return duaData.categories?.find((cat) => cat.id === id);
};
