# UI Testing Instructions - Interview App v2
OPENAI_KEY=your_openai_api_key_here

## Overview
This document provides comprehensive testing instructions for the Interview App v2 UI using Playwright automation. The app is built with Angular 20, PrimeNG components, and runs in both web and Electron desktop modes.

## Application Structure

### Main Navigation
- **Sidebar Navigation** with the following routes:
  - Dashboard (`/dashboard`)
  - Practice (`/interview`) 
  - AI Review (`/evaluator`)
  - Settings (`/settings`)

### Key UI Components
- **Layout**: Uses PrimeNG theme system with light/dark mode support
- **Theme Variables**: All colors use CSS custom properties (no hardcoded colors)
- **Components**: PrimeNG components (p-button, p-card, p-dropdown, etc.)

## Critical Test Scenarios

### 1. Settings Page - OpenAI API Key Configuration

**Route**: `/settings`

**Test Scenario 1: Configure OpenAI API Key**
```
1. Navigate to Settings page
2. Locate "OpenAI Configuration" card
3. Find API key password input field
4. Enter valid OpenAI API key (format: sk-...)
5. Click "Test Connection" button
6. Verify success message appears
7. Click "Save API Key" button
8. Verify key is saved successfully
```

**Element Selectors:**
- API Key Input: `p-password input[type="password"]`
- Test Button: `p-button:contains("Test")`
- Save Button: `p-button:contains("Save API Key")`
- Success Message: `p-message[severity="success"]`
- Status Indicator: `.text-green-500` (for valid key)

**Test Scenario 2: Invalid API Key Handling**
```
1. Enter invalid API key (e.g., "invalid-key")
2. Click "Test Connection"
3. Verify error message appears
4. Check that save button remains disabled
```

**Expected Behaviors:**
- Test button should be disabled when input is empty
- Loading spinner appears during testing
- Clear success/error messages
- Save button disabled until key is tested successfully

### 2. Dashboard Page

**Route**: `/dashboard`

**Test Scenario: Dashboard Layout**
```
1. Navigate to Dashboard
2. Verify stats widgets are displayed
3. Check that widgets use proper theme variables
4. Verify responsive grid layout
```

**Element Selectors:**
- Stats Widget: `app-stats-widget`
- Cards: `.card`
- Widget Icons: `.pi` (PrimeIcons)

**Expected Behaviors:**
- Widgets display placeholder or real data
- Theme colors adapt to light/dark mode
- Responsive layout on different screen sizes

### 3. Interview Page - Core Functionality

**Route**: `/interview`

**Test Scenario 1: Start Interview**
```
1. Navigate to Interview page
2. Select technology from dropdown
3. Select difficulty level
4. Enter number of questions
5. Click "Start Interview"
6. Verify interview session begins
```

**Element Selectors:**
- Technology Dropdown: `p-dropdown[formControlName="technology"]`
- Difficulty Dropdown: `p-dropdown[formControlName="difficulty"]`
- Question Count Input: `input[type="number"]`
- Start Button: `p-button:contains("Start Interview")`

**Test Scenario 2: Answer Questions**
```
1. After starting interview
2. Read the question text
3. Enter answer in textarea
4. Click "Submit Answer"
5. Wait for AI evaluation
6. Verify evaluation results display
7. Proceed to next question
```

**Element Selectors:**
- Question Text: `.question-text`
- Answer Textarea: `textarea[formControlName="answer"]`
- Submit Button: `p-button:contains("Submit")`
- Evaluation Results: `.evaluation-results`
- Score Display: `.score-display`

**Test Scenario 3: Error Handling (No API Key)**
```
1. Ensure no OpenAI API key is configured
2. Start interview and submit answer
3. Verify clear error message about missing API key
4. Verify user is guided to Settings page
```

**Expected Error Messages:**
- "OpenAI API key not configured. Please set your API key in Settings."
- "Desktop mode is required for AI evaluation."

### 4. Evaluator Page - Standalone Evaluation

**Route**: `/evaluator`

**Test Scenario: Manual Evaluation**
```
1. Navigate to Evaluator page
2. Configure role and experience level
3. Enter question text
4. Enter answer text
5. Click "Evaluate Answer"
6. Verify evaluation results
```

**Element Selectors:**
- Role Dropdown: `p-select#role`
- Level Dropdown: `p-select#level`
- Question Input: `textarea[name="question"]`
- Answer Input: `textarea[name="answer"]`
- Evaluate Button: `p-button:contains("Evaluate")`

### 5. Theme System Testing

**Test Scenario: Theme Switching**
```
1. Navigate to Settings
2. Locate theme dropdown
3. Switch between Light/Dark/System themes
4. Verify theme changes apply immediately
5. Check that all components respect theme colors
```

**Element Selectors:**
- Theme Dropdown: `p-dropdown#theme`
- Theme Options: `p-dropdown-item`

**Expected Behaviors:**
- Immediate theme application
- All components use theme variables
- No hardcoded colors visible
- Proper contrast in both modes

## Error Handling Test Scenarios

### API Key Errors
1. **Missing API Key**: Clear message directing to Settings
2. **Invalid API Key**: Proper error feedback during testing
3. **API Limit Reached**: Graceful handling of OpenAI quota errors
4. **Network Issues**: Timeout handling and retry options

### Service Availability
1. **Web Mode Limitations**: Clear messages about desktop-only features
2. **Evaluator Service Down**: Proper error messages and guidance
3. **Database Issues**: Fallback behaviors and error reporting

## Performance Testing

### Load Time Testing
```
1. Measure initial page load times
2. Check lazy loading of route modules
3. Verify smooth navigation between pages
4. Test theme switching performance
```

### Responsive Testing
```
1. Test on different screen sizes (mobile, tablet, desktop)
2. Verify grid layouts adapt properly
3. Check component responsiveness
4. Test sidebar collapse/expand
```

## Accessibility Testing

### Keyboard Navigation
```
1. Navigate entire app using only keyboard
2. Verify focus indicators are visible
3. Check tab order is logical
4. Test screen reader compatibility
```

### ARIA Labels
```
1. Verify form inputs have proper labels
2. Check button descriptions
3. Validate error message associations
4. Test status announcements
```

## Data Persistence Testing

### Settings Persistence
```
1. Configure API key and theme settings
2. Restart application
3. Verify settings are retained
4. Test export/import functionality
```

### Interview History
```
1. Complete an interview session
2. Verify data is saved to database
3. Check history appears correctly
4. Test data export functionality
```

## Cross-Platform Testing

### Desktop (Electron) Mode
```
1. Test all functionality in Electron app
2. Verify IPC communication works
3. Check file system operations
4. Test native integrations
```

### Web Browser Mode
```
1. Test in different browsers
2. Verify graceful degradation
3. Check localStorage functionality
4. Validate service worker behavior (if applicable)
```

## Test Data and Setup

### Prerequisites
- OpenAI API key for testing (use test account with limited quota)
- Sample questions in database
- Clean application state for testing

### Test Environment
- Node.js version as specified in package.json
- All dependencies installed via `npm install`
- Database initialized with sample data

### Test Commands
```bash
# Start development server
npm run dev

# Start Electron app
npm run dev:electron

# Run linting (should pass)
npm run lint

# Build application (should succeed)
npm run build
```

## Expected Application States

### Initial State (No Configuration)
- Settings page shows "Not Configured" for AI Evaluator
- Clear guidance to configure API key
- Interview attempts show helpful error messages

### Configured State (Valid API Key)
- Settings page shows "OpenAI GPT-4" with green checkmark
- Interviews work with real AI evaluation
- All features fully functional

### Error States
- Network disconnection handling
- API service unavailable scenarios
- Invalid configuration recovery

## Performance Expectations

### Load Times
- Initial page load: < 3 seconds
- Route navigation: < 1 second
- Theme switching: Immediate
- API responses: < 10 seconds

### Memory Usage
- Should not grow continuously during use
- Proper cleanup of components
- No memory leaks in long-running sessions

## UI Component Specifications

### PrimeNG Components Used
- `p-button`: Buttons with various severities
- `p-card`: Content containers
- `p-dropdown`/`p-select`: Selection components
- `p-inputtext`: Text inputs
- `p-password`: Password inputs with toggle
- `p-textarea`: Multi-line text inputs
- `p-message`: Status messages
- `p-progressspinner`: Loading indicators
- `p-toolbar`: Page headers
- `p-sidebar`: Navigation sidebar

### Custom Components
- `app-stats-widget`: Dashboard statistics
- `app-activity-widget`: Recent activity display
- `app-layout`: Main application layout
- `app-settings`: Settings page container

### CSS Classes to Test
- Theme variables: `--surface-card`, `--primary-color`
- Responsive classes: `col-span-12`, `md:col-span-6`
- State classes: `.active`, `.disabled`, `.loading`
- Semantic classes: `.text-primary`, `.bg-surface-card`

This comprehensive testing guide covers all major UI components, user flows, and edge cases for thorough automated testing with Playwright.