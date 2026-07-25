// Baseline categories so existing posts (saved before the admin-managed
// Blog Categories feature existed) still resolve to a real category name
// in the dropdown/filter UI. Admin-created categories (via blogCategoriesService)
// are merged on top of this list wherever categories are read.
export const DEFAULT_BLOG_CATEGORIES = ['Pharmacology', 'Clinical Practice', 'Career Guide', 'Education', 'Research']
