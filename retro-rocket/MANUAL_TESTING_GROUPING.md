# Manual Testing Steps for Card Grouping

## Prerequisites
1. Make sure the development server is running: `npm run dev`
2. Open http://localhost:3000 in your browser
3. Open browser developer tools (F12) and go to Console tab

## Test Steps

### 1. Create a Retrospective
1. Click "Crear Retrospectiva" on the home page
2. Enter your name as facilitator
3. Click "Crear Retrospectiva"

### 2. Join the Retrospective
1. You should be automatically taken to the retrospective page
2. If not, use the invitation link or code to join

### 3. Create Test Cards
1. Add at least 3-4 cards to any column (e.g., "Qué me ayudó")
2. Use similar content for testing grouping, for example:
   - "Good communication in daily standups"
   - "Effective daily meetings"
   - "Clear documentation"
   - "Well-written requirements"

### 4. Test Manual Grouping
1. Click the "Group Cards" button at the top of a column (should show when you have cards)
2. This should enter "grouping mode" - you should see selection checkboxes on cards
3. Select 2 or more cards by clicking their checkboxes
4. Click the "Create Group" button that appears
5. **Check the browser console for any error messages**

### 5. Expected Behavior
- After clicking "Create Group", you should see:
  - The selected cards grouped together
  - One card becomes the "head" (expanded)
  - Other cards become "members" (collapsed under the head)
  - The grouping mode should exit
  - No error messages in console

### 6. If Error Occurs
- Check the browser console for detailed error messages
- Look for log messages starting with:
  - "useCardGroups.createGroup called with:"
  - "Calling createCardGroup service..."
  - "Creating card group with:"
- Note any Firebase authentication errors
- Note any Firestore permission errors

### 7. Additional Tests
If basic grouping works:
1. Try collapsing/expanding groups
2. Try adding more cards to existing groups
3. Try disbanding groups
4. Try the AI grouping suggestions feature

## Expected Console Output (Success)
```
useCardGroups.createGroup called with: { headCardId: "...", memberCardIds: [...], ... }
Calling createCardGroup service...
Creating card group with: { retrospectiveId: "...", headCardId: "...", ... }
Group created with ID: "..."
Group created successfully with ID: "..."
```

## Common Error Scenarios

### Authentication Error
If you see "User not authenticated":
- Check if anonymous authentication is working
- Look for Firebase auth initialization messages

### Permission Error
If you see Firestore permission errors:
- Check if Firestore rules are properly deployed
- Verify the Firebase project configuration

### Missing Data Error
If you see validation errors:
- Ensure cards exist in the database
- Check if retrospectiveId is being passed correctly

### Network Error
If you see connection errors:
- Check internet connection
- Verify Firebase project is active
- Check Firebase configuration in .env file
