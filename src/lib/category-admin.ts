/**
 * Pure category vocabulary + shared types for the admin panel.
 * Client-safe: this file must never import `@/db`.
 */

export type AdminCategoryRow = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  showOnHome: boolean;
  productCount: number;
};

export type AdminCategoryList = {
  items: AdminCategoryRow[];
  total: number;
};

export type CategoryFormValues = {
  name: string;
  slug: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
  showOnHome: boolean;
};

export function emptyCategoryForm(nextSort: number): CategoryFormValues {
  return {
    name: "",
    slug: "",
    imageUrl: "",
    sortOrder: String(nextSort),
    isActive: true,
    showOnHome: false,
  };
}
