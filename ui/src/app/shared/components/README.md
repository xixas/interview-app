# Shared Components

This directory contains reusable UI components for the Interview App.

## ConfirmationDialogComponent

A reusable confirmation dialog component that provides consistent styling and behavior across the application.

### Usage

1. **Import the component:**
```typescript
import { ConfirmationDialogComponent, ConfirmationConfig } from '../shared/components/confirmation-dialog.component';
```

2. **Add to component imports:**
```typescript
@Component({
  imports: [
    // other imports...
    ConfirmationDialogComponent
  ]
})
```

3. **Create dialog configuration:**
```typescript
dialogConfig = signal<ConfirmationConfig>({
  title: 'Confirm Action',
  message: 'Are you sure you want to perform this action?',
  confirmLabel: 'Yes, Confirm', // optional, defaults to 'Confirm'
  cancelLabel: 'Cancel',        // optional, defaults to 'Cancel'
  confirmSeverity: 'danger',    // optional, defaults to 'primary'
  icon: 'pi pi-exclamation-triangle', // optional
  width: '450px'                // optional, defaults to '450px'
});

showDialog = signal(false);
```

4. **Add to template:**
```html
<app-confirmation-dialog
  [visible]="showDialog()"
  [config]="dialogConfig()"
  (onConfirm)="handleConfirm()"
  (onCancel)="showDialog.set(false)">
</app-confirmation-dialog>
```

### Features

- ✅ Consistent styling with theme support (light/dark mode)
- ✅ Proper button alignment (bottom-right)
- ✅ Configurable button labels and severity
- ✅ Optional icon support with automatic coloring
- ✅ Responsive width configuration
- ✅ Proper footer styling with borders
- ✅ Uses PrimeNG footer template for proper positioning

### Configuration Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | string | required | Dialog header title |
| `message` | string | required | Main confirmation message |
| `confirmLabel` | string | 'Confirm' | Confirm button text |
| `cancelLabel` | string | 'Cancel' | Cancel button text |
| `confirmSeverity` | ButtonSeverity | 'primary' | Confirm button color theme |
| `icon` | string | undefined | Optional icon class (e.g., 'pi pi-warning') |
| `width` | string | '450px' | Dialog width |

### Examples

#### Basic Confirmation
```typescript
basicDialogConfig = signal<ConfirmationConfig>({
  title: 'Delete Item',
  message: 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmLabel: 'Delete',
  confirmSeverity: 'danger'
});
```

#### With Icon
```typescript
warningDialogConfig = signal<ConfirmationConfig>({
  title: 'Unsaved Changes',
  message: 'You have unsaved changes. Are you sure you want to leave this page?',
  icon: 'pi pi-exclamation-triangle',
  confirmLabel: 'Leave Page',
  cancelLabel: 'Stay Here',
  confirmSeverity: 'warn'
});
```

#### Custom Width
```typescript
largeDialogConfig = signal<ConfirmationConfig>({
  title: 'Review Details',
  message: 'Please review the following details carefully before proceeding with this important action.',
  width: '600px'
});
```