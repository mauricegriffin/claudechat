# LiftKit Spacing Guidelines

## Golden Ratio Spacing System

LiftKit uses a spacing system based on the golden ratio (φ ≈ 1.618) for harmonious visual rhythm.

### Base Unit
- Base: 0.25rem (4px)

### Spacing Scale
Following the golden ratio progression:

- `gap-2`: 0.5rem (8px) - Minimal spacing
- `gap-4`: 1rem (16px) - Small spacing
- `gap-6`: 1.5rem (24px) - Medium spacing
- `gap-8`: 2rem (32px) - Large spacing ✓ (Recommended for form elements)
- `gap-10`: 2.5rem (40px) - Extra large spacing

### Padding Scale
- `p-4`: 1rem (16px) - Small padding
- `p-6`: 1.5rem (24px) - Medium padding
- `p-8`: 2rem (32px) - Large padding
- `p-10`: 2.5rem (40px) - Extra large padding ✓ (Recommended for card containers)

### Margin Scale
- `mb-4`: 1rem (16px) - Small margin
- `mb-6`: 1.5rem (24px) - Medium margin
- `mb-8`: 2rem (32px) - Large margin ✓ (Recommended between major sections)
- `mb-10`: 2.5rem (40px) - Extra large margin ✓ (Recommended after headings)

## Usage Guidelines

### Form Spacing
```jsx
// Recommended for auth forms
<form className="flex flex-col gap-8">
  <TextInput /> // 2rem gap between inputs
  <TextInput />
  <Button className="mt-6" /> // 1.5rem margin before submit button
</form>
```

### Card Container
```jsx
// Recommended for card containers
<Card className="p-10"> // 2.5rem internal padding
  <Text className="mb-10">Heading</Text> // 2.5rem after heading
  <Content />
</Card>
```

### Section Dividers
```jsx
// Recommended for dividers
<div className="my-8"> // 2rem vertical margin
  <Divider />
</div>
```

## Responsive Adjustments

On mobile (max-width: 768px), consider reducing spacing by one level:
- `gap-8` → `gap-6`
- `p-10` → `p-8`
- `mb-10` → `mb-8`

This maintains proportional spacing while accommodating smaller screens.