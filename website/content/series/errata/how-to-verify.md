# How to Verify RFC Errata

Verifiers can log in and verify, reject, hold, or edit RFC errata that have been reported. The verifying party is determined by the stream that produced the RFC: IETF, IAB, IRTF, Independent Submission, or Editorial.

1. On the [RFC Errata site](https://errata.rfc-editor.org), click **Login** at top right and use your [Datatracker](https://datatracker.ietf.org) credentials.
2. Under Available Tasks, click **Verify Reported Errata**.
3. For a given report, click **Classify**.
4. Edit the fields as needed, where
   * **Errata type:** Editorial or Technical; see [type definitions](/series/rfc-errata/#types-of-errata).
   * **Section:** the number of the section where the error appears or “GLOBAL” if the error appears throughout the RFC.
   * **Publication formats:** the affected format(s) if the RFC was published in multiple formats (TEXT, PDF, and HTML). This is present only for RFC 8650 and beyond.
   * **Original Text:** the text as it appears in the RFC
   * **Corrected Text:** the text as it should appear
   * **Notes:** any notes or rationale that are relevant to this report
6. Evaluate the accuracy and choose one option for the report (see [status definitions](/series/rfc-errata/#statuses-of-errata)):
   * **Save and Continue Editing** to edit the content without changing the status.
   * **Save and Mark Verified** if the report is necessary and valid.
   * **Save and Mark Rejected** if the report is invalid.
   * **Save and Mark Hold for Document Update** if the report is not a necessary update.
   * **Cancel** to not make any changes.
   * Note: If this report requires special handling (e.g., it should be removed, it affects existing errata), please send mail to the [RFC Editor](mailto:rfc-editor@rfc-editor.org), rather than proceeding.
7. Upon changing the status of a report (i.e., clicking **Save and Mark Verified** or **Rejected** or **Hold for Document Update**), an email will be sent to the relevant parties. Also, you will no longer have access to the report once its status has been changed. If you want to access errata that are no longer marked Reported, please contact the [RFC Editor](mailto:rfc-editor@rfc-editor.org).
8. View more reports that are available for you to classify.
9. Click **Logout** when you are finished classifying errata reports.
