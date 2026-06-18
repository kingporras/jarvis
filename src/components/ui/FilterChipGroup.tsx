interface FilterOption<TValue extends string> {
  label: string;
  value: TValue;
}

interface FilterChipGroupProps<TValue extends string> {
  label: string;
  onChange: (value: TValue) => void;
  options: FilterOption<TValue>[];
  value: TValue;
}

export function FilterChipGroup<TValue extends string>({
  label,
  onChange,
  options,
  value,
}: FilterChipGroupProps<TValue>) {
  return (
    <fieldset className="filter-chip-group">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <button
            aria-pressed={value === option.value}
            className={value === option.value ? "filter-chip filter-chip--active" : "filter-chip"}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
