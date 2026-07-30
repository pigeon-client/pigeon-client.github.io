
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** pigeon
- **Date:** 2026-07-26
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Create a request and send it from the main workspace
- **Test Code:** [TC001_Create_a_request_and_send_it_from_the_main_workspace.py](./TC001_Create_a_request_and_send_it_from_the_main_workspace.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the application under test did not respond at http://localhost:1420.

Observations:
- The browser shows "ERR_EMPTY_RESPONSE" with the message "localhost didn't send any data.".
- A "Reload" button is visible, but reloading did not load the SPA workspace and the app remained unavailable.
- The SPA main workspace (request tab controls and other interactive UI) never rendered, so composing a request could not be attempted.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/6b103b50-9d1f-44fe-a21c-5ee732b45766
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Compose and send a request
- **Test Code:** [TC002_Compose_and_send_a_request.py](./TC002_Compose_and_send_a_request.py)
- **Test Error:** TEST BLOCKED

The API Tester UI could not be reached — the application did not render in the browser and interactions cannot be performed.

Observations:
- The http://localhost:1420 tab shows a blank page with 0 interactive elements (no request editor UI visible).
- The http://127.0.0.1:1420 tab displayed an ERR_EMPTY_RESPONSE page with a 'Reload' button.
- Multiple waits and reload attempts were performed but the API Tester UI never appeared.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/ec19831c-5aea-44d0-91d8-5c5b1861e77b
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Set query parameters, headers, auth, and body before sending
- **Test Code:** [TC003_Set_query_parameters_headers_auth_and_body_before_sending.py](./TC003_Set_query_parameters_headers_auth_and_body_before_sending.py)
- **Test Error:** TEST BLOCKED

The test could not be run because the Pigeon workspace at http://localhost:1420 is not responding and the UI cannot be reached.

Observations:
- The browser displayed: "This page isn’t working" and the error code 'ERR_EMPTY_RESPONSE'.
- The page shows a single interactive 'Reload' button and no application UI or workspace elements were accessible.
- Repeated load and reload attempts were already performed; the local server appears down or unreachable.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/1f650286-6cef-4733-a335-af5fccd501e2
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Inspect a JSON response in different views
- **Test Code:** [TC004_Inspect_a_JSON_response_in_different_views.py](./TC004_Inspect_a_JSON_response_in_different_views.py)
- **Test Error:** TEST BLOCKED

The API tester UI could not be reached — the web application did not load, so the features to create/send requests and view responses are unavailable.

Observations:
- The page is blank and the SPA user interface did not load.
- No interactive elements (buttons, inputs, or request UI) were present on the page.
- The API request/response functionality could not be exercised because the UI is not available.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/4f42d0cd-2f3b-4670-a99b-a971db8e8cbc
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Use environment variables in a request
- **Test Code:** [TC005_Use_environment_variables_in_a_request.py](./TC005_Use_environment_variables_in_a_request.py)
- **Test Error:** TEST BLOCKED

The test could not be run because the application UI could not be reached on the local host.

Observations:
- The browser shows 'ERR_EMPTY_RESPONSE' with the message '127.0.0.1 didn't send any data.'
- Clicking the visible 'Reload' button and attempting navigation to both http://127.0.0.1:1420 and http://localhost:1420 did not load the app; the error page persisted after multiple attempts.

Because the SPA never rendered, the Environment manager and request UI could not be accessed and the requested verification steps cannot be performed.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/a507f449-a745-480e-8969-2657c0fb2b81
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Inspect response timing and size after a request completes
- **Test Code:** [TC006_Inspect_response_timing_and_size_after_a_request_completes.py](./TC006_Inspect_response_timing_and_size_after_a_request_completes.py)
- **Test Error:** TEST BLOCKED

The Pigeon API Tester UI could not be reached — the local server returned no response and the SPA never initialized.

Observations:
- The browser displayed an error page with text 'This page isn’t working' and 'ERR_EMPTY_RESPONSE'.
- Only a 'Reload' button was visible and clicking it did not load the API Tester UI.
- No application controls (e.g., 'New Request', method selector, URL input, or 'Send' button) were present, so the requested test steps could not be performed.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/5fcb32fa-32d4-4057-91dd-e2d64ff8d604
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Import a cURL command into a request
- **Test Code:** [TC007_Import_a_cURL_command_into_a_request.py](./TC007_Import_a_cURL_command_into_a_request.py)
- **Test Error:** TEST BLOCKED

The test could not be run because the application UI at http://localhost:1420 did not load and is unreachable.

Observations:
- The browser displayed "This page isn’t working" with message 'localhost didn’t send any data.' and error code ERR_EMPTY_RESPONSE.
- Clicking the visible "Reload" button did not load the app or reveal the request editor UI.
- No interactive elements for the application (request editor, 'New Request', or import controls) were present, so the cURL import feature could not be tested.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/dd5ae5d7-ce8b-4004-8656-290db1352943
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Keep request state intact across multiple tabs
- **Test Code:** [TC008_Keep_request_state_intact_across_multiple_tabs.py](./TC008_Keep_request_state_intact_across_multiple_tabs.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the local web application did not respond and returned a browser error page.

Observations:
- The page displays 'This page isn’t working' and 'ERR_EMPTY_RESPONSE'.
- Clicking the 'Reload' button in two tabs did not load the application.
- No application UI controls (for example, a 'New Request' button or request tabs) became available.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/c061c50c-2020-4565-a5cc-e2f6a79a6f63
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Keep query parameters in sync with the URL
- **Test Code:** [TC009_Keep_query_parameters_in_sync_with_the_URL.py](./TC009_Keep_query_parameters_in_sync_with_the_URL.py)
- **Test Error:** TEST BLOCKED

The Pigeon - API Tester UI could not be reached; the local server did not respond so the test could not be executed.

Observations:
- The browser shows an error page: 'ERR_EMPTY_RESPONSE' for 127.0.0.1.
- The app's request editor UI never appeared and no interactive app elements were available despite multiple reloads and waits.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/48ce8610-b6b3-465e-9c9c-aa934154d3bd
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Preserve separate request state across tabs
- **Test Code:** [TC010_Preserve_separate_request_state_across_tabs.py](./TC010_Preserve_separate_request_state_across_tabs.py)
- **Test Error:** TEST BLOCKED

The feature could not be reached — the application UI for creating and switching request tabs did not load.

Observations:
- The page at http://localhost:1420 is blank and shows no interactive elements or controls.
- Waiting for the SPA to load did not reveal any UI for opening request tabs or configuring requests.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/c313f079-5118-467e-a1dc-479a47fd3903
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Persist multiple request tabs while switching workspaces
- **Test Code:** [TC011_Persist_multiple_request_tabs_while_switching_workspaces.py](./TC011_Persist_multiple_request_tabs_while_switching_workspaces.py)
- **Test Error:** TEST BLOCKED

The Pigeon - API Tester SPA did not load; the UI cannot be interacted with, so the multi-tab request-state test cannot be executed.

Observations:
- The page title is 'Pigeon - API Tester' but the page content is blank after loading and shows no controls.
- The page reports 0 interactive elements and the screenshot is entirely blank.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/2f389d1a-23d7-4ec0-a323-e874bbd44ae7
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Switch environments and send with updated values
- **Test Code:** [TC012_Switch_environments_and_send_with_updated_values.py](./TC012_Switch_environments_and_send_with_updated_values.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the Pigeon UI did not load, preventing the environment manager and request features from being tested.

Observations:
- The Pigeon - API Tester page remained blank with no interactive elements visible.
- Two waits were performed and a reload was attempted; the reload failed with 'site unavailable'.
- The screenshot shows a blank page and browser_state reports 0 interactive elements.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/5452a1f9-3061-495d-bd70-2c6dcac9eb84
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 View an HTML response preview
- **Test Code:** [TC013_View_an_HTML_response_preview.py](./TC013_View_an_HTML_response_preview.py)
- **Test Error:** TEST BLOCKED

The API tester UI could not be reached — the page did not render and required controls are not available, so the test cannot be executed.

Observations:
- The page at http://localhost:1420 showed a blank page with 0 interactive elements.
- Reload/navigation attempts returned 'site unavailable' and the SPA did not render.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/6d1e8e8d-634a-4a38-8001-de63d7de4a18
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Reopen a draft or history entry into the workspace
- **Test Code:** [TC014_Reopen_a_draft_or_history_entry_into_the_workspace.py](./TC014_Reopen_a_draft_or_history_entry_into_the_workspace.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the Pigeon app on localhost did not load and the UI was not available for interaction.

Observations:
- The browser shows the error page: "This page isn’t working" with message 'localhost didn’t send any data.' and code ERR_EMPTY_RESPONSE.
- Only a 'Reload' button is present; clicking Reload (attempted multiple times) did not restore the application UI.
- No application interactive elements (New Request, History, Drafts, or workspace) were visible or accessible.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/2407807d-216c-406b-a3fc-07311ff44798
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Reopen a past request from history
- **Test Code:** [TC015_Reopen_a_past_request_from_history.py](./TC015_Reopen_a_past_request_from_history.py)
- **Test Error:** TEST BLOCKED

The application under test could not be reached — the UI is not available so the test cannot be executed.

Observations:
- The browser shows an error page stating 'This page isn’t working' and 'ERR_EMPTY_RESPONSE' for the application URL.
- No application UI or interactive elements (History tab, request editor) were present, so the steps that require the app cannot be performed.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/f110750f-7594-400a-8e8e-07cb46aa82c4/ad7a9187-bee7-4703-8e24-7be4974e2fd2
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---