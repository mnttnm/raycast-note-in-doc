# Test Workflows for Templates & Meeting Notes Features

This document provides comprehensive test workflows to validate the new Templates and Meeting Notes Intelligence features.

---

## Prerequisites

Before testing, ensure:
1. Raycast is installed and running
2. The extension is installed in development mode (`npm run dev`)
3. Google account is authenticated with the extension
4. Calendar API scope is granted (you may need to re-authenticate)

---

## 🎯 Feature 1: Templates System

### Test Workflow 1.1: First Launch & Default Templates

**Objective:** Verify that default templates are automatically created on first launch.

**Steps:**
1. Clear local storage (if testing fresh install):
   - In Raycast, open extension
   - Quit Raycast completely
   - Relaunch extension

2. Open the "Quick Note" command

3. Press `Cmd + T` to open "Manage Templates"

**Expected Results:**
- ✅ You should see 4 built-in templates:
  - Daily Log (;daily)
  - Meeting Notes (;meeting)
  - Quick Idea (;idea)
  - Bug Report (;bug)
- ✅ All templates should have a ⭐ star icon (indicating built-in)
- ✅ Each should show its trigger shortcut in the subtitle

**Pass Criteria:** All 4 templates appear with correct names and triggers.

---

### Test Workflow 1.2: Use a Template

**Objective:** Verify template insertion with variable substitution.

**Steps:**
1. Open "Quick Note" command
2. Press `Cmd + T` to open template actions
3. Select "Use: Daily Log"

**Expected Results:**
- ✅ The note textarea should populate with the Daily Log template
- ✅ `{{date}}` should be replaced with today's date (e.g., "12/5/2025")
- ✅ Template structure should include:
  ```
  # Daily Log - [TODAY'S DATE]

  ## Goals
  -

  ## Completed
  -

  ## Notes
  ```
- ✅ Cursor should be in the note field ready to edit

**Pass Criteria:** Template loads with date substitution working correctly.

---

### Test Workflow 1.3: Create Custom Template

**Objective:** Verify users can create their own templates.

**Steps:**
1. Open "Quick Note" command
2. Press `Cmd + T` → "Manage Templates"
3. Press `Cmd + N` to create new template
4. Fill in the form:
   - **Name:** "Weekly Review"
   - **Shortcut:** ";weekly"
   - **Content:**
     ```
     # Weekly Review - {{date}}

     ## Wins
     -

     ## Challenges
     -

     ## Next Week Goals
     -
     ```
5. Submit the form

**Expected Results:**
- ✅ Success toast appears: "Template created"
- ✅ New template appears in the list
- ✅ Template shows 📄 document icon (not star, indicating custom)
- ✅ "Custom" label appears as accessory

**Pass Criteria:** Custom template is created and appears in the list.

---

### Test Workflow 1.4: Edit Template

**Objective:** Verify template editing functionality.

**Steps:**
1. In "Manage Templates", select "Weekly Review" (custom template created above)
2. Press `Cmd + E` to edit
3. Modify the name to "Weekly Reflection"
4. Add a new section to content:
   ```
   ## Gratitude
   -
   ```
5. Submit the form

**Expected Results:**
- ✅ Success toast: "Template updated"
- ✅ Template name changes to "Weekly Reflection"
- ✅ Content includes new "Gratitude" section when used

**Pass Criteria:** Template updates persist correctly.

---

### Test Workflow 1.5: Delete Custom Template

**Objective:** Verify deletion works for custom templates only.

**Steps:**
1. In "Manage Templates", select "Weekly Reflection"
2. Press `Cmd + Delete`
3. Confirm deletion in alert dialog

4. Try to delete a built-in template (e.g., "Daily Log")
5. Press `Cmd + Delete`

**Expected Results:**
- ✅ Custom template: Confirmation dialog appears, template is deleted after confirmation
- ✅ Built-in template: Error toast appears: "Cannot delete built-in templates"

**Pass Criteria:** Custom templates can be deleted; built-in templates cannot.

---

### Test Workflow 1.6: Template Variable Substitution

**Objective:** Verify all template variables work correctly.

**Steps:**
1. Create a test template with all variables:
   ```
   Test Template - {{date}}
   Time: {{time}}
   Full DateTime: {{datetime}}
   Meeting: {{meeting_title}}
   Attendees: {{meeting_attendees}}
   ```
2. Use the template (when NOT in a meeting)

**Expected Results:**
- ✅ `{{date}}` → Today's date (e.g., "12/5/2025")
- ✅ `{{time}}` → Current time (e.g., "2:30 PM")
- ✅ `{{datetime}}` → Full datetime string
- ✅ `{{meeting_title}}` → Empty (no meeting context)
- ✅ `{{meeting_attendees}}` → Empty (no meeting context)

**Pass Criteria:** All non-meeting variables populate correctly; meeting variables are cleared.

---

### Test Workflow 1.7: Quick Template Access

**Objective:** Verify first 5 templates appear in quick actions.

**Steps:**
1. Open "Quick Note" command
2. Open action panel (usually Cmd+K or Cmd+Enter)
3. Look for "Templates" section

**Expected Results:**
- ✅ First 5 templates appear as individual actions
- ✅ Each shows "Use: [Template Name]"
- ✅ Icons match template type (star for built-in, document for custom)
- ✅ "Manage Templates" action appears at bottom with Cmd+T shortcut

**Pass Criteria:** Template actions are easily accessible from main form.

---

## 📅 Feature 2: Meeting Notes Intelligence

### Test Workflow 2.1: Meeting Detection

**Objective:** Verify the extension detects active calendar meetings.

**Prerequisite:**
- Create a test calendar event in Google Calendar
- Set it to start NOW and end in 30 minutes
- Add at least 2 attendees

**Steps:**
1. Wait for the meeting time to arrive
2. Open "Quick Note" command in Raycast

**Expected Results:**
- ✅ A meeting banner appears below the note field:
  ```
  📅 Active Meeting Detected
  [Meeting Title] ([Start Time] - [End Time])
  Attendees: [Attendee 1], [Attendee 2]
  ```
- ✅ Attendee list excludes the current user
- ✅ Organizer is marked with "(Organizer)" if not the current user

**Pass Criteria:** Meeting detection works and displays correct information.

---

### Test Workflow 2.2: Use Meeting Template

**Objective:** Verify meeting template auto-populates with meeting context.

**Prerequisite:** Be in an active meeting (as per Test 2.1)

**Steps:**
1. Open "Quick Note" command (meeting banner should be visible)
2. Press `Cmd + M` to use meeting template

**Expected Results:**
- ✅ Meeting template loads with all fields populated:
  ```
  # Meeting: [Actual Meeting Title]

  **Date:** [Current Date/Time]
  **Attendees:** [Actual Attendee Names]

  ## Agenda
  -

  ## Discussion Notes
  -

  ## Action Items
  - [ ]
  ```
- ✅ Meeting title matches calendar event
- ✅ Attendees match calendar event (excluding self)
- ✅ Cursor is positioned for editing

**Pass Criteria:** Meeting template is fully populated with calendar data.

---

### Test Workflow 2.3: No Meeting Scenario

**Objective:** Verify behavior when no meeting is active.

**Steps:**
1. Ensure no calendar events are currently active
2. Open "Quick Note" command

**Expected Results:**
- ✅ No meeting banner appears
- ✅ "Use Meeting Template" action (Cmd+M) does NOT appear in action panel
- ✅ Regular templates still work normally

**Pass Criteria:** Extension handles no-meeting state gracefully.

---

### Test Workflow 2.4: Meeting Template Without Meeting Context

**Objective:** Verify meeting template can be used manually without active meeting.

**Steps:**
1. Ensure no meeting is active
2. Open "Manage Templates"
3. Select "Meeting Notes" template
4. Use the template

**Expected Results:**
- ✅ Template loads with structure intact
- ✅ `{{meeting_title}}` and `{{meeting_attendees}}` are cleared (empty)
- ✅ `{{date}}` and `{{datetime}}` still populate correctly
- ✅ User can manually fill in meeting details

**Pass Criteria:** Template works even without calendar context.

---

### Test Workflow 2.5: Multiple Attendees

**Objective:** Verify correct attendee list formatting.

**Prerequisite:**
- Create a test meeting with 5+ attendees
- Include yourself as attendee
- Set someone else as organizer

**Steps:**
1. Join the meeting time window
2. Open "Quick Note" and use meeting template (Cmd+M)

**Expected Results:**
- ✅ Attendee list includes all participants except yourself
- ✅ Organizer is listed first with "(Organizer)" label
- ✅ Attendees are comma-separated
- ✅ Display names are used (not email addresses)

**Pass Criteria:** Attendee list is correctly formatted and filtered.

---

### Test Workflow 2.6: Calendar Permission Grant

**Objective:** Verify smooth re-authentication for Calendar API.

**Steps:**
1. If this is first time using meeting features, you may need to re-auth
2. Open "Quick Note" command
3. If prompted, grant Calendar permissions

**Expected Results:**
- ✅ OAuth flow triggers if calendar scope not granted
- ✅ Permission screen shows both Drive and Calendar scopes
- ✅ After granting, extension works without further prompts

**Pass Criteria:** Re-authentication flow works smoothly.

---

## 🔄 Integration Tests

### Test Workflow 3.1: End-to-End Meeting Notes Workflow

**Objective:** Full workflow from meeting detection to note submission.

**Steps:**
1. Schedule a test meeting starting now
2. Open "Quick Note" when meeting is active
3. Press `Cmd + M` to use meeting template
4. Add some notes:
   ```
   ## Agenda
   - Discuss project timeline

   ## Discussion Notes
   - Team agreed on 2-week sprint

   ## Action Items
   - [ ] Update project plan by Friday
   - [ ] Schedule follow-up meeting
   ```
5. Press `Cmd + Enter` to submit

**Expected Results:**
- ✅ Note is sent to Google Doc
- ✅ Success toast appears
- ✅ Note appears at top of document
- ✅ Timestamp is bold
- ✅ Meeting template structure is preserved
- ✅ All meeting details are included

**Pass Criteria:** Complete meeting notes workflow works end-to-end.

---

### Test Workflow 3.2: Template + Document Selection

**Objective:** Verify templates work with different target documents.

**Steps:**
1. Create a new Google Doc via "All Docs" → `Cmd + N`
   - Name it "Meeting Notes Archive"
2. Return to "Quick Note"
3. Change location to "Meeting Notes Archive"
4. Use Daily Log template
5. Submit the note

**Expected Results:**
- ✅ Template loads correctly
- ✅ Note is sent to "Meeting Notes Archive" (not default doc)
- ✅ Note appears in correct document when opened in browser

**Pass Criteria:** Templates work with custom document selection.

---

### Test Workflow 3.3: Rapid Template Switching

**Objective:** Verify users can preview multiple templates before choosing.

**Steps:**
1. Open "Quick Note"
2. Use "Daily Log" template
3. Before submitting, use "Quick Idea" template
4. Before submitting, use "Bug Report" template
5. Submit the final note

**Expected Results:**
- ✅ Each template replacement works instantly
- ✅ Previous template content is fully replaced (no mixing)
- ✅ Variables are re-substituted for each template
- ✅ Final submitted note contains only the last selected template

**Pass Criteria:** Template switching is smooth and doesn't cause data corruption.

---

## 🐛 Edge Cases & Error Handling

### Test Workflow 4.1: Empty Template Content

**Objective:** Verify validation prevents empty templates.

**Steps:**
1. Open "Manage Templates" → `Cmd + N`
2. Enter name but leave content empty
3. Try to submit

**Expected Results:**
- ✅ Error message appears: "Content is required"
- ✅ Form does not submit
- ✅ Error clears when user starts typing in content field

**Pass Criteria:** Validation prevents invalid template creation.

---

### Test Workflow 4.2: Calendar API Failure

**Objective:** Verify graceful degradation if Calendar API fails.

**Steps:**
1. Disconnect network temporarily
2. Open "Quick Note" command
3. Observe behavior

**Expected Results:**
- ✅ Extension loads (doesn't crash)
- ✅ No meeting banner appears (graceful fallback)
- ✅ Templates still work normally
- ✅ No error toasts shown to user

**Pass Criteria:** Extension handles Calendar API failures silently.

---

### Test Workflow 4.3: All-Day Event Detection

**Objective:** Verify all-day events don't trigger meeting detection.

**Steps:**
1. Create an all-day event in Google Calendar for today
2. Open "Quick Note" command

**Expected Results:**
- ✅ All-day event is ignored
- ✅ No meeting banner appears
- ✅ "Use Meeting Template" action does NOT appear

**Pass Criteria:** All-day events are correctly filtered out.

---

## 📊 Performance Tests

### Test Workflow 5.1: Template Load Time

**Objective:** Verify templates load quickly.

**Steps:**
1. Create 10 custom templates
2. Open "Quick Note" command
3. Measure time to load

**Expected Results:**
- ✅ Extension loads in < 1 second
- ✅ Template actions appear instantly in action panel
- ✅ No lag when switching between templates

**Pass Criteria:** No noticeable performance degradation.

---

### Test Workflow 5.2: Calendar Fetch Performance

**Objective:** Verify calendar fetching doesn't block UI.

**Steps:**
1. Add 20+ events to today's calendar
2. Open "Quick Note" command
3. Start typing immediately

**Expected Results:**
- ✅ Form is interactive immediately (non-blocking)
- ✅ Meeting banner appears within 1-2 seconds (async)
- ✅ User can type notes while calendar loads

**Pass Criteria:** Calendar detection doesn't block user input.

---

## ✅ Success Criteria Summary

For the features to be production-ready, the following must pass:

### Templates Feature:
- [ ] All 4 default templates initialize correctly
- [ ] Template CRUD operations work (create, edit, delete)
- [ ] Variable substitution works for all variables
- [ ] Built-in templates cannot be deleted
- [ ] Custom templates persist across app restarts
- [ ] Template management UI is intuitive

### Meeting Notes Feature:
- [ ] Current meeting detection works reliably
- [ ] Meeting context populates correctly (title, attendees, times)
- [ ] Meeting template auto-fills with calendar data
- [ ] Extension handles no-meeting state gracefully
- [ ] Calendar permissions are requested properly
- [ ] All-day events are filtered out
- [ ] Performance is acceptable (no blocking operations)

### Integration:
- [ ] Templates work with all document selection options
- [ ] End-to-end workflow (template → edit → submit) works
- [ ] Error handling is graceful (no crashes)
- [ ] UI/UX is consistent with existing plugin patterns

---

## 🚀 Automated Testing Ideas (Future)

For CI/CD pipelines, consider:
1. Unit tests for template-service.ts functions
2. Mock Calendar API responses for integration tests
3. E2E tests using Raycast extension testing framework (if available)
4. Performance benchmarks for template loading and calendar fetching

---

## 📝 Feedback Collection

After testing, collect feedback on:
1. **Ease of Use:** Is template management intuitive?
2. **Value:** Do templates save time for common note-taking tasks?
3. **Meeting Detection:** Is the meeting banner helpful or distracting?
4. **Template Discoverability:** Can users easily find and use templates?
5. **Variable Clarity:** Are template variables self-explanatory?

---

## 🎉 Conclusion

These test workflows cover:
- ✅ Core functionality (templates, meeting detection)
- ✅ Edge cases (errors, empty states, API failures)
- ✅ Integration scenarios (end-to-end workflows)
- ✅ Performance considerations

**Next Steps:**
1. Execute these test workflows manually
2. Document any issues found
3. Iterate on UX based on feedback
4. Consider building automated tests for regression prevention

Happy Testing! 🚀
