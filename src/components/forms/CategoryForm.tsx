'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface CategoryFormProps {
  categories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

export default function CategoryForm({ categories, onCategoriesChange }: CategoryFormProps) {
  const [categoryInput, setCategoryInput] = useState('');

  const addCategory = () => {
    if (categoryInput.trim() && !categories.includes(categoryInput.trim())) {
      const newCategories = [...categories, categoryInput.trim()];
      onCategoriesChange(newCategories);
      setCategoryInput('');
    }
  };

  const removeCategory = (category: string) => {
    const newCategories = categories.filter(cat => cat !== category);
    onCategoriesChange(newCategories);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-card-foreground mb-1">
        Categories
      </label>
      <div className="flex space-x-2">
        <input
          type="text"
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addCategory()}
          placeholder="Add category"
          className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
        />
        <button
          onClick={addCategory}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Add
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {categories.map((category, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
          >
            {category}
            <button
              onClick={() => removeCategory(category)}
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}