'use client';

interface FieldSelectorProps {
  fieldId: string;
  fieldName: string;
  description: string;
  isSelected: boolean;
  onToggle: (field: string) => void;
  children?: React.ReactNode;
}

export default function FieldSelector({
  fieldId,
  fieldName,
  description,
  isSelected,
  onToggle,
  children
}: FieldSelectorProps) {
  return (
    <div className="flex items-center space-x-3">
      <input
        type="checkbox"
        id={fieldId}
        checked={isSelected}
        onChange={() => onToggle(fieldId)}
        className="w-4 h-4 text-primary rounded focus:ring-primary"
      />
      <label htmlFor={fieldId} className="flex-1">
        <div className="font-medium text-card-foreground">{fieldName}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </label>
      {isSelected && children && (
        <div className="w-64">
          {children}
        </div>
      )}
    </div>
  );
}